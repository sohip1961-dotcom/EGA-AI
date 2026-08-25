-- Phase 2 Database Migrations: Flashcards, Streaks, and Leaderboard RPC

-- 1. Add study_streak to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS study_streak INTEGER DEFAULT 1 NOT NULL;

-- 2. Create index on profiles for grade_level and coins
CREATE INDEX IF NOT EXISTS profiles_coins_idx ON public.profiles(coins DESC);
CREATE INDEX IF NOT EXISTS profiles_grade_level_idx ON public.profiles(grade_level);

-- 3. Create index on exam_submissions for user_id to speed up leaderboard RPC
CREATE INDEX IF NOT EXISTS exam_submissions_user_id_idx ON public.exam_submissions(user_id);

-- 4. Create Flashcard Decks Table
CREATE TABLE IF NOT EXISTS public.flashcard_decks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    subject_name TEXT NOT NULL,
    grade_level TEXT NOT NULL,
    title TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Create Flashcards Table
CREATE TABLE IF NOT EXISTS public.flashcards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deck_id UUID NOT NULL REFERENCES public.flashcard_decks(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    box INTEGER DEFAULT 1 NOT NULL CHECK (box >= 1 AND box <= 5),
    next_review_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Indexes for Flashcards
CREATE INDEX IF NOT EXISTS flashcards_deck_id_idx ON public.flashcards(deck_id);
CREATE INDEX IF NOT EXISTS flashcards_next_review_at_idx ON public.flashcards(next_review_at);

-- 7. Leaderboard RPC
CREATE OR REPLACE FUNCTION public.get_leaderboard(
    p_grade_level TEXT DEFAULT NULL,
    p_limit INT DEFAULT 20
)
RETURNS TABLE (
    user_id UUID,
    name TEXT,
    grade_level TEXT,
    coins NUMERIC,
    study_streak INT,
    average_accuracy NUMERIC,
    rank_number BIGINT
) AS $$
BEGIN
    RETURN QUERY
    WITH student_stats AS (
        SELECT 
            p.id AS s_user_id,
            p.name AS s_name,
            p.grade_level AS s_grade_level,
            p.coins AS s_coins,
            p.study_streak AS s_study_streak,
            COALESCE(
                (SELECT AVG(es.score) 
                 FROM public.exam_submissions es 
                 WHERE es.user_id = p.id), 
                0.0
            ) AS s_avg_accuracy
        FROM 
            public.profiles p
        WHERE 
            p.role = 'student'
            AND (p_grade_level IS NULL OR p.grade_level = p_grade_level)
    )
    SELECT 
        s_user_id,
        s_name,
        s_grade_level,
        s_coins,
        s_study_streak,
        ROUND(s_avg_accuracy, 2) AS average_accuracy,
        ROW_NUMBER() OVER (
            ORDER BY 
                s_coins DESC, 
                s_study_streak DESC, 
                s_avg_accuracy DESC
        ) AS rank_number
    FROM 
        student_stats
    ORDER BY 
        rank_number ASC
    LIMIT 
        p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
