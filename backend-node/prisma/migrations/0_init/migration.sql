CREATE TABLE users (
    id              BIGSERIAL PRIMARY KEY,
    username        VARCHAR(100) NOT NULL UNIQUE,
    password_hash   VARCHAR(255) NOT NULL,
    height_cm       NUMERIC(5,2) NULL,
    wrist_cm        NUMERIC(5,2) NULL,
    unit_system     VARCHAR(20) NOT NULL DEFAULT 'METRIC' CHECK (unit_system IN ('METRIC', 'IMPERIAL')),
    created_at      TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE metric_definitions (
    id              BIGSERIAL PRIMARY KEY,
    user_id         BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name            VARCHAR(100) NOT NULL,
    unit            VARCHAR(20) NOT NULL,
    display_order   INT NOT NULL DEFAULT 0,
    is_active       BOOLEAN NOT NULL DEFAULT true,
    how_to_measure  TEXT NULL,
    CONSTRAINT uq_metric_definitions_user_name UNIQUE (user_id, name)
);

CREATE TABLE measurements (
    id                  BIGSERIAL PRIMARY KEY,
    user_id             BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    measurement_date    DATE NOT NULL,
    note                TEXT NULL,
    created_at          TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT uq_measurements_user_date UNIQUE (user_id, measurement_date)
);

CREATE TABLE measurement_values (
    id                      BIGSERIAL PRIMARY KEY,
    measurement_id          BIGINT NOT NULL REFERENCES measurements(id) ON DELETE CASCADE,
    metric_definition_id    BIGINT NOT NULL REFERENCES metric_definitions(id) ON DELETE CASCADE,
    "value"                 NUMERIC(10,2) NOT NULL,
    CONSTRAINT uq_measurement_values_measurement_metric UNIQUE (measurement_id, metric_definition_id)
);

CREATE TABLE progress_photos (
    id              BIGSERIAL PRIMARY KEY,
    user_id         BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    measurement_id  BIGINT NULL REFERENCES measurements(id) ON DELETE SET NULL,
    photo_date      DATE NOT NULL,
    file_path       VARCHAR(500) NOT NULL,
    created_at      TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX idx_measurements_user_date ON measurements(user_id, measurement_date);
CREATE INDEX idx_measurement_values_measurement_metric ON measurement_values(measurement_id, metric_definition_id);
CREATE INDEX idx_metric_definitions_user ON metric_definitions(user_id);
CREATE INDEX idx_progress_photos_user_date ON progress_photos(user_id, photo_date);
