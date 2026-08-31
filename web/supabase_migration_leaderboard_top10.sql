-- Migration: Leaderboard Top 10 & User Rank Function
-- Adds RPC function to fetch a specific student's rank, stats, and top 10 status

DROP FUNCTION IF EXISTS public.get_user_leaderboard_rank(UUID, TEXT);
DROP FUNCTION IF EXISTS public.get_user_leaderboard_rank(UUID);

CREATE OR REPLACE FUNCTION public.get_user_leaderboard_rank(
    p_user_id UUID,
    p_grade_level TEXT DEFAULT NULL
)
RETURNS TABLE (
    user_id UUID,
    name TEXT,
    grade_level TEXT,
    coins NUMERIC,
    points NUMERIC,
    study_streak INT,
    average_accuracy NUMERIC,
    rank_number BIGINT,
    is_in_top_10 BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    WITH ranked_students AS (
        SELECT 
            p.id AS s_user_id,
            p.name AS s_name,
            p.grade_level AS s_grade_level,
            p.coins AS s_coins,
            COALESCE(p.points, 0) AS s_points,
            COALESCE(p.study_streak, 1) AS s_study_streak,
            COALESCE(
                (SELECT AVG(es.score) 
                 FROM public.exam_submissions es 
                 WHERE es.user_id = p.id), 
                0.0
            ) AS s_avg_accuracy,
            ROW_NUMBER() OVER (
                ORDER BY 
                    COALESCE(p.points, 0) DESC,
                    COALESCE(p.study_streak, 1) DESC, 
                    COALESCE((SELECT AVG(es.score) FROM public.exam_submissions es WHERE es.user_id = p.id), 0.0) DESC
            ) AS rank_num
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
        rank_num AS rank_number,
        (rank_num <= 10) AS is_in_top_10
    FROM 
        ranked_students
    WHERE 
        s_user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
