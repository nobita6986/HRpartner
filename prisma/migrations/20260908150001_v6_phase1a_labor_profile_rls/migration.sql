-- Migration: v6_phase1a_labor_profile_rls
-- Forward-only RLS for three internal Phase 1A tables.
-- Reuses existing hrp_session_role()/hrp_session_user_id() helpers.
-- No helper replacement and no public/anonymous policy.

-- LABOR_PROFILES
ALTER TABLE labor_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE labor_profiles FORCE ROW LEVEL SECURITY;

CREATE POLICY hrp_labor_profile_scope ON labor_profiles
  AS PERMISSIVE FOR ALL
  TO app_user_writer, app_user
  USING (
    hrp_session_role() IN ('ADMIN', 'HR_MANAGER', 'DIRECTOR')
    OR (
      hrp_session_role() = 'HR_STAFF'
      AND labor_profiles.worker_id IS NULL
    )
    OR (
      hrp_session_role() = 'HR_STAFF'
      AND labor_profiles.worker_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM workers w
        WHERE w.id = labor_profiles.worker_id
          AND w.assigned_to_id = hrp_session_user_id()
      )
    )
    OR (
      hrp_session_role() = 'SALE'
      AND EXISTS (
        SELECT 1 FROM workers w
        WHERE w.id = labor_profiles.worker_id
          AND w.owner_id = hrp_session_user_id()
      )
    )
    OR (
      hrp_session_role() = 'WORKER'
      AND EXISTS (
        SELECT 1 FROM workers w
        WHERE w.id = labor_profiles.worker_id
          AND w.account_user_id = hrp_session_user_id()
      )
    )
  )
  WITH CHECK (
    hrp_session_role() IN ('ADMIN', 'HR_MANAGER', 'DIRECTOR')
    OR (
      hrp_session_role() = 'HR_STAFF'
      AND labor_profiles.worker_id IS NULL
    )
  );

-- LABOR_PROFILE_INTAKES: inherits the parent LaborProfile scope.
ALTER TABLE labor_profile_intakes ENABLE ROW LEVEL SECURITY;
ALTER TABLE labor_profile_intakes FORCE ROW LEVEL SECURITY;

CREATE POLICY hrp_labor_profile_intake_scope ON labor_profile_intakes
  AS PERMISSIVE FOR ALL
  TO app_user_writer, app_user
  USING (
    hrp_session_role() IN ('ADMIN', 'HR_MANAGER', 'DIRECTOR')
    OR EXISTS (
      SELECT 1 FROM labor_profiles lp
      WHERE lp.id = labor_profile_intakes.labor_profile_id
        AND (
          (
            hrp_session_role() = 'HR_STAFF'
            AND lp.worker_id IS NULL
          )
          OR (
            hrp_session_role() = 'HR_STAFF'
            AND lp.worker_id IS NOT NULL
            AND EXISTS (
              SELECT 1 FROM workers w
              WHERE w.id = lp.worker_id
                AND w.assigned_to_id = hrp_session_user_id()
            )
          )
          OR (
            hrp_session_role() = 'SALE'
            AND EXISTS (
              SELECT 1 FROM workers w
              WHERE w.id = lp.worker_id
                AND w.owner_id = hrp_session_user_id()
            )
          )
          OR (
            hrp_session_role() = 'WORKER'
            AND EXISTS (
              SELECT 1 FROM workers w
              WHERE w.id = lp.worker_id
                AND w.account_user_id = hrp_session_user_id()
            )
          )
        )
    )
  )
  WITH CHECK (
    hrp_session_role() IN ('ADMIN', 'HR_MANAGER', 'DIRECTOR')
    OR (
      hrp_session_role() = 'HR_STAFF'
      AND EXISTS (
        SELECT 1 FROM labor_profiles lp
        WHERE lp.id = labor_profile_intakes.labor_profile_id
          AND lp.worker_id IS NULL
      )
    )
  );

-- EMPLOYMENT_EPISODES: inherits the parent LaborProfile scope.
ALTER TABLE employment_episodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE employment_episodes FORCE ROW LEVEL SECURITY;

CREATE POLICY hrp_employment_episode_scope ON employment_episodes
  AS PERMISSIVE FOR ALL
  TO app_user_writer, app_user
  USING (
    hrp_session_role() IN ('ADMIN', 'HR_MANAGER', 'DIRECTOR')
    OR EXISTS (
      SELECT 1 FROM labor_profiles lp
      WHERE lp.id = employment_episodes.labor_profile_id
        AND (
          (
            hrp_session_role() = 'HR_STAFF'
            AND lp.worker_id IS NOT NULL
            AND EXISTS (
              SELECT 1 FROM workers w
              WHERE w.id = lp.worker_id
                AND w.assigned_to_id = hrp_session_user_id()
            )
          )
          OR (
            hrp_session_role() = 'SALE'
            AND EXISTS (
              SELECT 1 FROM workers w
              WHERE w.id = lp.worker_id
                AND w.owner_id = hrp_session_user_id()
            )
          )
          OR (
            hrp_session_role() = 'WORKER'
            AND EXISTS (
              SELECT 1 FROM workers w
              WHERE w.id = lp.worker_id
                AND w.account_user_id = hrp_session_user_id()
            )
          )
        )
    )
  )
  WITH CHECK (
    hrp_session_role() IN ('ADMIN', 'HR_MANAGER', 'DIRECTOR')
  );
