WITH ranked_meta_decks AS (
				SELECT
					ts.deck_name,
					COUNT(*) AS play_count,
					ROW_NUMBER() OVER (
						ORDER BY COUNT(*) DESC, ts.deck_name ASC
					) AS meta_rank
				FROM tournament_standings ts
				INNER JOIN tournaments t
					ON ts.tournament_id = t.id
				WHERE ts.deck_name IS NOT NULL
				  AND ts.deck_name <> 'Unknown'
				  AND ts.deck_name <> 'Other'
				  AND t.tournament_date >= DATE(?, '-' || ? || ' days')
				  AND t.tournament_date < DATE(?)
				GROUP BY ts.deck_name
			),
			rogue_results AS (
				SELECT
					ts.tournament_id,
					t.limitless_id AS tournament_limitless_id,
					ts.player_id,
					ts.deck_name,
					CASE
						WHEN ts.deck_name = 'Other'
							THEN 'Other:' || ts.tournament_id || ':' || ts.player_id
						ELSE ts.deck_name
					END AS deck_key,
					rmd.meta_rank,
					rmd.play_count AS meta_play_count,
					CASE
						WHEN rmd.meta_rank IS NULL THEN 5
						WHEN rmd.meta_rank <= 60 THEN 1
						WHEN rmd.meta_rank <= 70 THEN 2
						WHEN rmd.meta_rank <= 80 THEN 3
						WHEN rmd.meta_rank <= 90 THEN 4
						ELSE 5
					END AS rogue_rating,
					COALESCE(ts.player_display_name, 'Unknown player') AS player_name,
					p.name AS player_handle,
					t.name AS tournament_name,
					t.players AS tournament_players,
					ts.standing,
					ts.record_wins,
					ts.record_losses,
					ts.record_ties,
					ts.decklist_export,
					(ts.record_wins + ts.record_losses + ts.record_ties) AS rounds_played,
					ROUND((ts.standing * 100.0) / NULLIF(t.players, 0), 2) AS finish_percentage
				FROM tournament_standings ts
				INNER JOIN tournaments t
					ON ts.tournament_id = t.id
				INNER JOIN players p
					ON ts.player_id = p.id
				LEFT JOIN ranked_meta_decks rmd
					ON ts.deck_name = rmd.deck_name
				WHERE ts.deck_name IS NOT NULL
				  AND ts.deck_name <> 'Unknown'
				  AND ts.standing IS NOT NULL
				  AND t.tournament_date >= DATE(?)
				  AND t.tournament_date < DATE(?, '+1 day')
				  AND (
					  rmd.meta_rank IS NULL
					  OR rmd.meta_rank > ?
				  )
				  AND t.players >= 32
			),
			best_rogue_results AS (
				SELECT
					deck_key,
					MIN(finish_percentage) AS best_finish_percentage
				FROM rogue_results
				GROUP BY deck_key
			)
			SELECT
				rr.tournament_id,
				rr.tournament_limitless_id,
				rr.player_id,
				rr.deck_name,
				rr.meta_rank,
				rr.meta_play_count,
				rr.rogue_rating,
				rr.player_name,
				rr.player_handle,
				rr.tournament_name,
				rr.tournament_players,
				rr.standing,
				rr.record_wins AS wins,
				rr.record_losses AS losses,
				rr.record_ties AS ties,
				rr.rounds_played,
				rr.finish_percentage,
				rr.decklist_export
			FROM rogue_results rr
			INNER JOIN best_rogue_results brr
				ON rr.deck_key = brr.deck_key
			   AND rr.finish_percentage = brr.best_finish_percentage
			ORDER BY
				rr.finish_percentage ASC,
				rr.tournament_players DESC,
				rr.record_wins DESC,
				rr.standing ASC,
				rr.player_id ASC
			LIMIT ?