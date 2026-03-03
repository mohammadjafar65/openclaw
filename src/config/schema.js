/**
 * OpenClaw Production Database Schema
 * Complete multi-tenant schema with 20+ tables
 * Supports: Discovery, Enrichment, Audit, Personalization, Campaigns, CRM, Compliance
 */

const TABLES = [
  // ══════════════════════════════════════════════════════════
  // ── ORGANIZATIONS (Multi-tenant) ─────────────────────────
  // ══════════════════════════════════════════════════════════
  `CREATE TABLE IF NOT EXISTS organizations (
    id                   INT AUTO_INCREMENT PRIMARY KEY,
    name                 VARCHAR(255) NOT NULL,
    slug                 VARCHAR(100) UNIQUE,
    plan                 ENUM('free','starter','pro','enterprise') DEFAULT 'free',
    monthly_lead_limit   INT DEFAULT 500,
    monthly_email_limit  INT DEFAULT 1000,
    stripe_customer_id   VARCHAR(255) DEFAULT NULL,
    settings             JSON DEFAULT NULL,
    created_at           TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at           TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  // ══════════════════════════════════════════════════════════
  // ── USERS ────────────────────────────────────────────────
  // ══════════════════════════════════════════════════════════
  `CREATE TABLE IF NOT EXISTS users (
    id                INT AUTO_INCREMENT PRIMARY KEY,
    organization_id   INT DEFAULT NULL,
    email             VARCHAR(255) NOT NULL UNIQUE,
    password          VARCHAR(255) NOT NULL,
    full_name         VARCHAR(255) DEFAULT 'User',
    role              ENUM('admin','manager','sales_rep','researcher','copy_reviewer') DEFAULT 'admin',
    avatar_url        TEXT DEFAULT NULL,
    is_active         TINYINT(1) DEFAULT 1,
    last_login_at     TIMESTAMP NULL,
    created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE SET NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  // ══════════════════════════════════════════════════════════
  // ── CAMPAIGNS ────────────────────────────────────────────
  // ══════════════════════════════════════════════════════════
  `CREATE TABLE IF NOT EXISTS campaigns (
    id                    INT AUTO_INCREMENT PRIMARY KEY,
    organization_id       INT DEFAULT NULL,
    name                  VARCHAR(255) NOT NULL,
    description           TEXT DEFAULT NULL,
    campaign_type         ENUM('discovery','outreach') DEFAULT 'discovery',
    status                ENUM('draft','active','paused','completed','archived') DEFAULT 'draft',
    -- Discovery config
    niche                 VARCHAR(255) DEFAULT NULL,
    micro_niche           VARCHAR(255) DEFAULT NULL,
    region                VARCHAR(255) DEFAULT NULL,
    country_code          VARCHAR(10) DEFAULT NULL,
    radius_km             INT DEFAULT 25,
    min_rating            DECIMAL(2,1) DEFAULT 0.0,
    min_reviews           INT DEFAULT 0,
    -- Outreach config
    audience_filter       JSON DEFAULT NULL,
    daily_send_limit      INT DEFAULT 30,
    send_start_hour       INT DEFAULT 9,
    send_end_hour         INT DEFAULT 17,
    send_timezone         VARCHAR(50) DEFAULT 'UTC',
    send_days             JSON DEFAULT '[1,2,3,4,5]',
    tracking_enabled      TINYINT(1) DEFAULT 1,
    approval_required     TINYINT(1) DEFAULT 0,
    ab_testing_enabled    TINYINT(1) DEFAULT 0,
    smtp_config_id        INT DEFAULT NULL,
    -- Stats (cached)
    total_leads           INT DEFAULT 0,
    total_sent            INT DEFAULT 0,
    total_opened          INT DEFAULT 0,
    total_replied         INT DEFAULT 0,
    total_bounced         INT DEFAULT 0,
    -- Meta
    created_by            INT DEFAULT NULL,
    created_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  // ══════════════════════════════════════════════════════════
  // ── LEADS (core entity) ──────────────────────────────────
  // ══════════════════════════════════════════════════════════
  `CREATE TABLE IF NOT EXISTS leads (
    id                    INT AUTO_INCREMENT PRIMARY KEY,
    organization_id       INT DEFAULT NULL,
    campaign_id           INT DEFAULT NULL,
    -- Identity
    google_place_id       VARCHAR(255) DEFAULT NULL,
    business_name         VARCHAR(500) NOT NULL,
    category              VARCHAR(255) DEFAULT NULL,
    subcategories         JSON DEFAULT NULL,
    -- Location
    address               TEXT DEFAULT NULL,
    city                  VARCHAR(255) DEFAULT NULL,
    state_province        VARCHAR(255) DEFAULT NULL,
    country               VARCHAR(255) DEFAULT NULL,
    country_code          VARCHAR(10) DEFAULT NULL,
    postal_code           VARCHAR(20) DEFAULT NULL,
    latitude              DECIMAL(10,8) DEFAULT NULL,
    longitude             DECIMAL(11,8) DEFAULT NULL,
    -- Contact
    phone                 VARCHAR(50) DEFAULT NULL,
    phone_international   VARCHAR(50) DEFAULT NULL,
    website               TEXT DEFAULT NULL,
    website_domain        VARCHAR(255) DEFAULT NULL,
    email                 VARCHAR(255) DEFAULT NULL,
    email_source          VARCHAR(50) DEFAULT NULL,
    email_confidence      INT DEFAULT 0,
    whatsapp_number       VARCHAR(50) DEFAULT NULL,
    -- Ratings
    rating                DECIMAL(2,1) DEFAULT NULL,
    review_count          INT DEFAULT 0,
    -- Source
    source                VARCHAR(50) DEFAULT 'google_places',
    source_url            TEXT DEFAULT NULL,
    source_confidence     INT DEFAULT 80,
    -- Social
    social_facebook       TEXT DEFAULT NULL,
    social_instagram      TEXT DEFAULT NULL,
    social_linkedin       TEXT DEFAULT NULL,
    social_twitter        TEXT DEFAULT NULL,
    social_youtube        TEXT DEFAULT NULL,
    -- Website status & audit
    has_website           TINYINT(1) DEFAULT NULL,
    website_status        ENUM('none','active','parked','error','unknown') DEFAULT 'unknown',
    audit_classification  ENUM('none','outdated','average','strong','unaudited') DEFAULT 'unaudited',
    audit_score           INT DEFAULT 0,
    -- Scores
    opportunity_score     INT DEFAULT 0,
    urgency_score         INT DEFAULT 0,
    lead_score            INT DEFAULT 0,
    lead_priority         ENUM('hot','warm','cold','disqualified','unscored') DEFAULT 'unscored',
    -- CRM
    stage                 VARCHAR(50) DEFAULT 'new',
    tags                  JSON DEFAULT NULL,
    assigned_to           INT DEFAULT NULL,
    deal_value            DECIMAL(10,2) DEFAULT NULL,
    -- Timestamps
    last_contacted_at     TIMESTAMP NULL,
    last_enriched_at      TIMESTAMP NULL,
    last_audited_at       TIMESTAMP NULL,
    -- Legacy compat
    ai_score              INT DEFAULT 0,
    score_breakdown       JSON DEFAULT NULL,
    score_notes           TEXT DEFAULT NULL,
    notes                 TEXT DEFAULT NULL,
    raw_data              JSON DEFAULT NULL,
    -- Meta
    created_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE SET NULL,
    FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE SET NULL,
    FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE INDEX idx_place_id (google_place_id),
    INDEX idx_org_stage (organization_id, stage),
    INDEX idx_org_score (organization_id, lead_score),
    INDEX idx_domain (website_domain),
    INDEX idx_email (email)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  // ══════════════════════════════════════════════════════════
  // ── LEAD CONTACTS (multiple contacts per lead) ───────────
  // ══════════════════════════════════════════════════════════
  `CREATE TABLE IF NOT EXISTS lead_contacts (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    lead_id         INT NOT NULL,
    type            ENUM('email','phone','whatsapp','facebook','instagram','linkedin','twitter','youtube','other') DEFAULT 'email',
    value           VARCHAR(500) NOT NULL,
    label           VARCHAR(100) DEFAULT NULL,
    confidence      INT DEFAULT 50,
    source          VARCHAR(100) DEFAULT NULL,
    is_primary      TINYINT(1) DEFAULT 0,
    is_verified     TINYINT(1) DEFAULT 0,
    verified_at     TIMESTAMP NULL,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE,
    INDEX idx_lead (lead_id),
    INDEX idx_type_value (type, value(191))
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  // ══════════════════════════════════════════════════════════
  // ── LEAD SOURCES (traceability) ──────────────────────────
  // ══════════════════════════════════════════════════════════
  `CREATE TABLE IF NOT EXISTS lead_sources (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    lead_id         INT NOT NULL,
    source_type     VARCHAR(50) NOT NULL,
    source_url      TEXT DEFAULT NULL,
    source_data     JSON DEFAULT NULL,
    confidence      INT DEFAULT 80,
    captured_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE,
    INDEX idx_lead (lead_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  // ══════════════════════════════════════════════════════════
  // ── WEBSITE AUDITS ───────────────────────────────────────
  // ══════════════════════════════════════════════════════════
  `CREATE TABLE IF NOT EXISTS website_audits (
    id                       INT AUTO_INCREMENT PRIMARY KEY,
    lead_id                  INT NOT NULL,
    url_audited              TEXT NOT NULL,
    classification           ENUM('none','outdated','average','strong') DEFAULT 'none',
    overall_score            INT DEFAULT 0,
    factor_scores            JSON DEFAULT NULL,
    top_redesign_reasons     JSON DEFAULT NULL,
    opportunity_summary      TEXT DEFAULT NULL,
    urgency_score            INT DEFAULT 0,
    recommended_website_type TEXT DEFAULT NULL,
    best_outreach_angle      VARCHAR(100) DEFAULT NULL,
    outreach_angles          JSON DEFAULT NULL,
    screenshot_desktop       TEXT DEFAULT NULL,
    screenshot_mobile        TEXT DEFAULT NULL,
    lighthouse_scores        JSON DEFAULT NULL,
    tech_stack               JSON DEFAULT NULL,
    ssl_valid                TINYINT(1) DEFAULT NULL,
    page_load_time_ms        INT DEFAULT NULL,
    mobile_friendly          TINYINT(1) DEFAULT NULL,
    has_contact_form         TINYINT(1) DEFAULT NULL,
    has_booking_widget       TINYINT(1) DEFAULT NULL,
    ai_model_used            VARCHAR(100) DEFAULT NULL,
    audited_at               TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at               TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE,
    INDEX idx_lead (lead_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  // ══════════════════════════════════════════════════════════
  // ── LEAD SCORES ──────────────────────────────────────────
  // ══════════════════════════════════════════════════════════
  `CREATE TABLE IF NOT EXISTS lead_scores (
    id                       INT AUTO_INCREMENT PRIMARY KEY,
    lead_id                  INT NOT NULL UNIQUE,
    opportunity_score        INT DEFAULT 0,
    contact_confidence_score INT DEFAULT 0,
    market_value_score       INT DEFAULT 0,
    engagement_score         INT DEFAULT 0,
    composite_score          INT DEFAULT 0,
    priority                 ENUM('hot','warm','cold','disqualified') DEFAULT 'cold',
    scoring_factors          JSON DEFAULT NULL,
    scored_at                TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at               TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at               TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  // ══════════════════════════════════════════════════════════
  // ── SMTP CONFIGS ─────────────────────────────────────────
  // ══════════════════════════════════════════════════════════
  `CREATE TABLE IF NOT EXISTS smtp_configs (
    id                    INT AUTO_INCREMENT PRIMARY KEY,
    organization_id       INT DEFAULT NULL,
    name                  VARCHAR(255) NOT NULL,
    host                  VARCHAR(255) NOT NULL,
    port                  INT DEFAULT 587,
    secure                TINYINT(1) DEFAULT 0,
    username              VARCHAR(255) DEFAULT NULL,
    password_encrypted    TEXT DEFAULT NULL,
    from_email            VARCHAR(255) NOT NULL,
    from_name             VARCHAR(255) DEFAULT NULL,
    daily_limit           INT DEFAULT 50,
    warmup_enabled        TINYINT(1) DEFAULT 0,
    warmup_current_limit  INT DEFAULT 5,
    is_verified           TINYINT(1) DEFAULT 0,
    is_active             TINYINT(1) DEFAULT 1,
    last_sent_at          TIMESTAMP NULL,
    created_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE SET NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  // ══════════════════════════════════════════════════════════
  // ── SEQUENCES (campaign steps) ───────────────────────────
  // ══════════════════════════════════════════════════════════
  `CREATE TABLE IF NOT EXISTS sequences (
    id                INT AUTO_INCREMENT PRIMARY KEY,
    campaign_id       INT NOT NULL,
    step_number       INT DEFAULT 1,
    delay_days        INT DEFAULT 0,
    delay_hours       INT DEFAULT 0,
    subject_template  TEXT DEFAULT NULL,
    body_template     LONGTEXT DEFAULT NULL,
    variant_label     VARCHAR(10) DEFAULT 'A',
    is_ai_generated   TINYINT(1) DEFAULT 0,
    template_id       INT DEFAULT NULL,
    created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
    INDEX idx_campaign_step (campaign_id, step_number)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  // ══════════════════════════════════════════════════════════
  // ── CAMPAIGN LEADS (M2M with state) ──────────────────────
  // ══════════════════════════════════════════════════════════
  `CREATE TABLE IF NOT EXISTS campaign_leads (
    id                INT AUTO_INCREMENT PRIMARY KEY,
    campaign_id       INT NOT NULL,
    lead_id           INT NOT NULL,
    current_step      INT DEFAULT 0,
    status            ENUM('pending','active','paused','completed','replied','bounced','unsubscribed') DEFAULT 'pending',
    variant_assigned  VARCHAR(10) DEFAULT 'A',
    next_send_at      TIMESTAMP NULL,
    enrolled_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at      TIMESTAMP NULL,
    created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
    FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE,
    UNIQUE INDEX idx_campaign_lead (campaign_id, lead_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  // ══════════════════════════════════════════════════════════
  // ── TEMPLATES ────────────────────────────────────────────
  // ══════════════════════════════════════════════════════════
  `CREATE TABLE IF NOT EXISTS templates (
    id                INT AUTO_INCREMENT PRIMARY KEY,
    organization_id   INT DEFAULT NULL,
    name              VARCHAR(255) NOT NULL,
    type              ENUM('email','whatsapp','call_script') DEFAULT 'email',
    category          VARCHAR(100) DEFAULT 'cold_intro',
    subject           TEXT DEFAULT NULL,
    body              LONGTEXT DEFAULT NULL,
    variables         JSON DEFAULT NULL,
    is_ai_generated   TINYINT(1) DEFAULT 0,
    performance_score DECIMAL(5,2) DEFAULT 0.00,
    times_used        INT DEFAULT 0,
    created_by        INT DEFAULT NULL,
    created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  // ══════════════════════════════════════════════════════════
  // ── OUTREACH MESSAGES ────────────────────────────────────
  // ══════════════════════════════════════════════════════════
  `CREATE TABLE IF NOT EXISTS outreach_messages (
    id                INT AUTO_INCREMENT PRIMARY KEY,
    organization_id   INT DEFAULT NULL,
    campaign_id       INT DEFAULT NULL,
    lead_id           INT NOT NULL,
    sequence_step     INT DEFAULT 1,
    channel           ENUM('email','whatsapp','call') DEFAULT 'email',
    direction         ENUM('outbound','inbound') DEFAULT 'outbound',
    status            ENUM('draft','scheduled','queued','sending','sent','delivered','opened','clicked','replied','bounced','failed') DEFAULT 'draft',
    subject           TEXT DEFAULT NULL,
    body              LONGTEXT DEFAULT NULL,
    plain_text        LONGTEXT DEFAULT NULL,
    from_email        VARCHAR(255) DEFAULT NULL,
    to_email          VARCHAR(255) DEFAULT NULL,
    message_id        VARCHAR(255) DEFAULT NULL,
    tracking_id       VARCHAR(100) DEFAULT NULL,
    opened_at         TIMESTAMP NULL,
    open_count        INT DEFAULT 0,
    clicked_at        TIMESTAMP NULL,
    replied_at        TIMESTAMP NULL,
    bounced_at        TIMESTAMP NULL,
    bounce_type       ENUM('hard','soft') DEFAULT NULL,
    error_message     TEXT DEFAULT NULL,
    approved_by       INT DEFAULT NULL,
    approved_at       TIMESTAMP NULL,
    sent_at           TIMESTAMP NULL,
    scheduled_for     TIMESTAMP NULL,
    created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE SET NULL,
    FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE SET NULL,
    FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE,
    INDEX idx_tracking (tracking_id),
    INDEX idx_campaign_lead (campaign_id, lead_id),
    INDEX idx_status (status)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  // ══════════════════════════════════════════════════════════
  // ── INBOX THREADS ────────────────────────────────────────
  // ══════════════════════════════════════════════════════════
  `CREATE TABLE IF NOT EXISTS inbox_threads (
    id                INT AUTO_INCREMENT PRIMARY KEY,
    organization_id   INT DEFAULT NULL,
    lead_id           INT DEFAULT NULL,
    campaign_id       INT DEFAULT NULL,
    subject           TEXT DEFAULT NULL,
    last_message_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    message_count     INT DEFAULT 0,
    is_read           TINYINT(1) DEFAULT 0,
    status            ENUM('active','archived','snoozed') DEFAULT 'active',
    snoozed_until     TIMESTAMP NULL DEFAULT NULL,
    created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE SET NULL,
    FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE SET NULL,
    INDEX idx_org_status (organization_id, status)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  // ══════════════════════════════════════════════════════════
  // ── REPLIES ──────────────────────────────────────────────
  // ══════════════════════════════════════════════════════════
  `CREATE TABLE IF NOT EXISTS replies (
    id                    INT AUTO_INCREMENT PRIMARY KEY,
    thread_id             INT DEFAULT NULL,
    lead_id               INT NOT NULL,
    outreach_message_id   INT DEFAULT NULL,
    from_email            VARCHAR(255) DEFAULT NULL,
    subject               TEXT DEFAULT NULL,
    body                  LONGTEXT DEFAULT NULL,
    plain_text            LONGTEXT DEFAULT NULL,
    classification        ENUM('interested','not_interested','unsubscribe','auto_reply','neutral','unknown') DEFAULT 'unknown',
    sentiment_score       DECIMAL(3,2) DEFAULT 0.00,
    imap_message_id       VARCHAR(255) DEFAULT NULL,
    ai_analysis           TEXT DEFAULT NULL,
    processed             TINYINT(1) DEFAULT 0,
    received_at           TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    classified_at         TIMESTAMP NULL,
    created_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (thread_id) REFERENCES inbox_threads(id) ON DELETE SET NULL,
    FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE,
    INDEX idx_lead (lead_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  // ══════════════════════════════════════════════════════════
  // ── NOTES ────────────────────────────────────────────────
  // ══════════════════════════════════════════════════════════
  `CREATE TABLE IF NOT EXISTS notes (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    lead_id     INT NOT NULL,
    user_id     INT DEFAULT NULL,
    content     TEXT NOT NULL,
    is_pinned   TINYINT(1) DEFAULT 0,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_lead (lead_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  // ══════════════════════════════════════════════════════════
  // ── TASKS ────────────────────────────────────────────────
  // ══════════════════════════════════════════════════════════
  `CREATE TABLE IF NOT EXISTS tasks (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    organization_id INT DEFAULT NULL,
    lead_id         INT DEFAULT NULL,
    assigned_to     INT DEFAULT NULL,
    created_by      INT DEFAULT NULL,
    title           VARCHAR(500) NOT NULL,
    description     TEXT DEFAULT NULL,
    type            ENUM('follow_up','call','email','meeting','proposal','other') DEFAULT 'follow_up',
    priority        ENUM('low','medium','high','urgent') DEFAULT 'medium',
    status          ENUM('pending','in_progress','completed','cancelled') DEFAULT 'pending',
    due_at          TIMESTAMP NULL,
    completed_at    TIMESTAMP NULL,
    reminder_at     TIMESTAMP NULL,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE SET NULL,
    FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE SET NULL,
    FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_assigned_status (assigned_to, status),
    INDEX idx_due (due_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  // ══════════════════════════════════════════════════════════
  // ── SUPPRESSION LIST ─────────────────────────────────────
  // ══════════════════════════════════════════════════════════
  `CREATE TABLE IF NOT EXISTS suppression_list (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    organization_id INT DEFAULT NULL,
    type            ENUM('email','domain','phone') DEFAULT 'email',
    value           VARCHAR(500) NOT NULL,
    reason          VARCHAR(255) DEFAULT NULL,
    source          ENUM('manual','unsubscribe','bounce','complaint','import') DEFAULT 'manual',
    added_by        INT DEFAULT NULL,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE SET NULL,
    FOREIGN KEY (added_by) REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE INDEX idx_org_type_value (organization_id, type, value(191)),
    INDEX idx_value (value(191))
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  // ══════════════════════════════════════════════════════════
  // ── ACTIVITY LOGS ────────────────────────────────────────
  // ══════════════════════════════════════════════════════════
  `CREATE TABLE IF NOT EXISTS activity_logs (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    organization_id INT DEFAULT NULL,
    user_id         INT DEFAULT NULL,
    lead_id         INT DEFAULT NULL,
    campaign_id     INT DEFAULT NULL,
    action          VARCHAR(100) NOT NULL,
    entity_type     VARCHAR(50) DEFAULT NULL,
    entity_id       INT DEFAULT NULL,
    details         JSON DEFAULT NULL,
    ip_address      VARCHAR(45) DEFAULT NULL,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE SET NULL,
    INDEX idx_org_created (organization_id, created_at),
    INDEX idx_lead (lead_id),
    INDEX idx_action (action)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  // ══════════════════════════════════════════════════════════
  // ── JOB QUEUE ────────────────────────────────────────────
  // ══════════════════════════════════════════════════════════
  `CREATE TABLE IF NOT EXISTS job_queue (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    type         VARCHAR(100) NOT NULL,
    payload      JSON DEFAULT NULL,
    status       ENUM('pending','processing','done','failed') DEFAULT 'pending',
    attempts     INT DEFAULT 0,
    max_attempts INT DEFAULT 3,
    error        TEXT DEFAULT NULL,
    priority     INT DEFAULT 5,
    run_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP NULL,
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_status_run (status, run_at),
    INDEX idx_type (type)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  // ══════════════════════════════════════════════════════════
  // ── SETTINGS ─────────────────────────────────────────────
  // ══════════════════════════════════════════════════════════
  `CREATE TABLE IF NOT EXISTS settings (
    key_name   VARCHAR(100) PRIMARY KEY,
    value      TEXT DEFAULT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  // ══════════════════════════════════════════════════════════
  // ── LEGACY: OUTREACH SEQUENCES (backward compat) ─────────
  // ══════════════════════════════════════════════════════════
  `CREATE TABLE IF NOT EXISTS outreach_sequences (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    lead_id       INT NOT NULL,
    campaign_id   INT DEFAULT NULL,
    channel       ENUM('email','sms','voicemail') DEFAULT 'email',
    step          INT DEFAULT 1,
    send_at       TIMESTAMP NULL,
    sent_at       TIMESTAMP NULL,
    status        ENUM('pending','sent','opened','clicked','replied','bounced','failed') DEFAULT 'pending',
    subject       TEXT DEFAULT NULL,
    body          LONGTEXT DEFAULT NULL,
    open_count    INT DEFAULT 0,
    click_count   INT DEFAULT 0,
    message_id    VARCHAR(255) DEFAULT NULL,
    error_msg     TEXT DEFAULT NULL,
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE,
    FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE SET NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
];

// Safe migrations — ALTER statements that won't fail if already applied
const MIGRATIONS = [
  // Users table migrations
  "ALTER TABLE users ADD COLUMN organization_id INT DEFAULT NULL",
  "ALTER TABLE users ADD COLUMN full_name VARCHAR(255) DEFAULT 'User'",
  "ALTER TABLE users ADD COLUMN avatar_url TEXT DEFAULT NULL",
  "ALTER TABLE users ADD COLUMN is_active TINYINT(1) DEFAULT 1",
  "ALTER TABLE users ADD COLUMN last_login_at TIMESTAMP NULL",

  // Leads table — new columns for enhanced schema
  "ALTER TABLE leads ADD COLUMN organization_id INT DEFAULT NULL",
  "ALTER TABLE leads ADD COLUMN google_place_id VARCHAR(255) DEFAULT NULL",
  "ALTER TABLE leads ADD COLUMN subcategories JSON DEFAULT NULL",
  "ALTER TABLE leads ADD COLUMN state_province VARCHAR(255) DEFAULT NULL",
  "ALTER TABLE leads ADD COLUMN country_code VARCHAR(10) DEFAULT NULL",
  "ALTER TABLE leads ADD COLUMN postal_code VARCHAR(20) DEFAULT NULL",
  "ALTER TABLE leads ADD COLUMN latitude DECIMAL(10,8) DEFAULT NULL",
  "ALTER TABLE leads ADD COLUMN longitude DECIMAL(11,8) DEFAULT NULL",
  "ALTER TABLE leads ADD COLUMN phone_international VARCHAR(50) DEFAULT NULL",
  "ALTER TABLE leads ADD COLUMN website TEXT DEFAULT NULL",
  "ALTER TABLE leads ADD COLUMN website_domain VARCHAR(255) DEFAULT NULL",
  "ALTER TABLE leads ADD COLUMN email VARCHAR(255) DEFAULT NULL",
  "ALTER TABLE leads ADD COLUMN email_source VARCHAR(50) DEFAULT NULL",
  "ALTER TABLE leads ADD COLUMN email_confidence INT DEFAULT 0",
  "ALTER TABLE leads ADD COLUMN whatsapp_number VARCHAR(50) DEFAULT NULL",
  "ALTER TABLE leads ADD COLUMN source VARCHAR(50) DEFAULT 'google_places'",
  "ALTER TABLE leads ADD COLUMN source_url TEXT DEFAULT NULL",
  "ALTER TABLE leads ADD COLUMN source_confidence INT DEFAULT 80",
  "ALTER TABLE leads ADD COLUMN social_facebook TEXT DEFAULT NULL",
  "ALTER TABLE leads ADD COLUMN social_instagram TEXT DEFAULT NULL",
  "ALTER TABLE leads ADD COLUMN social_linkedin TEXT DEFAULT NULL",
  "ALTER TABLE leads ADD COLUMN social_twitter TEXT DEFAULT NULL",
  "ALTER TABLE leads ADD COLUMN social_youtube TEXT DEFAULT NULL",
  "ALTER TABLE leads ADD COLUMN has_website TINYINT(1) DEFAULT NULL",
  "ALTER TABLE leads ADD COLUMN audit_classification ENUM('none','outdated','average','strong','unaudited') DEFAULT 'unaudited'",
  "ALTER TABLE leads ADD COLUMN audit_score INT DEFAULT 0",
  "ALTER TABLE leads ADD COLUMN opportunity_score INT DEFAULT 0",
  "ALTER TABLE leads ADD COLUMN urgency_score INT DEFAULT 0",
  "ALTER TABLE leads ADD COLUMN lead_score INT DEFAULT 0",
  "ALTER TABLE leads ADD COLUMN lead_priority ENUM('hot','warm','cold','disqualified','unscored') DEFAULT 'unscored'",
  "ALTER TABLE leads ADD COLUMN stage VARCHAR(50) DEFAULT 'new'",
  "ALTER TABLE leads ADD COLUMN tags JSON DEFAULT NULL",
  "ALTER TABLE leads ADD COLUMN assigned_to INT DEFAULT NULL",
  "ALTER TABLE leads ADD COLUMN deal_value DECIMAL(10,2) DEFAULT NULL",
  "ALTER TABLE leads ADD COLUMN last_contacted_at TIMESTAMP NULL",
  "ALTER TABLE leads ADD COLUMN last_enriched_at TIMESTAMP NULL",
  "ALTER TABLE leads ADD COLUMN last_audited_at TIMESTAMP NULL",

  // Campaigns table — new columns
  "ALTER TABLE campaigns ADD COLUMN organization_id INT DEFAULT NULL",
  "ALTER TABLE campaigns ADD COLUMN description TEXT DEFAULT NULL",
  "ALTER TABLE campaigns ADD COLUMN campaign_type ENUM('discovery','outreach') DEFAULT 'discovery'",
  "ALTER TABLE campaigns ADD COLUMN country_code VARCHAR(10) DEFAULT NULL",
  "ALTER TABLE campaigns ADD COLUMN audience_filter JSON DEFAULT NULL",
  "ALTER TABLE campaigns ADD COLUMN daily_send_limit INT DEFAULT 30",
  "ALTER TABLE campaigns ADD COLUMN send_start_hour INT DEFAULT 9",
  "ALTER TABLE campaigns ADD COLUMN send_end_hour INT DEFAULT 17",
  "ALTER TABLE campaigns ADD COLUMN send_timezone VARCHAR(50) DEFAULT 'UTC'",
  "ALTER TABLE campaigns ADD COLUMN send_days JSON DEFAULT '[1,2,3,4,5]'",
  "ALTER TABLE campaigns ADD COLUMN tracking_enabled TINYINT(1) DEFAULT 1",
  "ALTER TABLE campaigns ADD COLUMN approval_required TINYINT(1) DEFAULT 0",
  "ALTER TABLE campaigns ADD COLUMN ab_testing_enabled TINYINT(1) DEFAULT 0",
  "ALTER TABLE campaigns ADD COLUMN smtp_config_id INT DEFAULT NULL",
  "ALTER TABLE campaigns ADD COLUMN total_leads INT DEFAULT 0",
  "ALTER TABLE campaigns ADD COLUMN total_sent INT DEFAULT 0",
  "ALTER TABLE campaigns ADD COLUMN total_opened INT DEFAULT 0",
  "ALTER TABLE campaigns ADD COLUMN total_replied INT DEFAULT 0",
  "ALTER TABLE campaigns ADD COLUMN total_bounced INT DEFAULT 0",

  // Suppression list — new columns
  "ALTER TABLE suppression_list ADD COLUMN organization_id INT DEFAULT NULL",
  "ALTER TABLE suppression_list ADD COLUMN source ENUM('manual','unsubscribe','bounce','complaint','import') DEFAULT 'manual'",
  "ALTER TABLE suppression_list ADD COLUMN added_by INT DEFAULT NULL",
];

module.exports = { TABLES, MIGRATIONS };
