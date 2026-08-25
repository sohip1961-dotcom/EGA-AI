-- Phase 3 Migration: Leaderboard points system & chat engagement tracking

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS points NUMERIC NOT NULL DEFAULT 0;
ALTER TABLE public.chat_sessions ADD COLUMN IF NOT EXISTS engagement_points_awarded BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.exam_submissions ADD COLUMN IF NOT EXISTS points_awarded NUMERIC NOT NULL DEFAULT 0;
ALTER TABLE public.exam_submissions ADD COLUMN IF NOT EXISTS is_first_attempt BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS profiles_points_idx ON public.profiles(points DESC);

-- Update get_leaderboard RPC function to order by points DESC
DROP FUNCTION IF EXISTS public.get_leaderboard(TEXT, INT);
DROP FUNCTION IF EXISTS public.get_leaderboard();

CREATE OR REPLACE FUNCTION public.get_leaderboard(
    p_grade_level TEXT DEFAULT NULL,
    p_limit INT DEFAULT 20
)
RETURNS TABLE (
    user_id UUID,
    name TEXT,
    grade_level TEXT,
    coins NUMERIC,
    points NUMERIC,
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
            p.points AS s_points,
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
            AND LOWER(COALESCE(p.email, '')) NOT LIKE '%test%'
            AND LOWER(COALESCE(p.email, '')) NOT LIKE '%trial%'
            AND LOWER(COALESCE(p.name, '')) NOT LIKE '%test%'
            AND LOWER(COALESCE(p.name, '')) NOT LIKE '%trial%'
            AND COALESCE(p.name, '') NOT LIKE '%اختباري%'
            AND COALESCE(p.name, '') NOT LIKE '%تجريبي%'
    )
    SELECT 
        s_user_id,
        s_name,
        s_grade_level,
        s_coins,
        s_points,
        s_study_streak,
        ROUND(s_avg_accuracy, 2) AS average_accuracy,
        ROW_NUMBER() OVER (
            ORDER BY 
                s_points DESC,
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
