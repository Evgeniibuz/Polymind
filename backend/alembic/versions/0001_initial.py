"""initial schema

Revision ID: 0001_initial
Revises:
Create Date: 2026-01-15 00:00:00.000000
"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0001_initial"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # ---- users ----
    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("auth_provider", sa.String(16), nullable=False),
        sa.Column("auth_identifier", sa.String(256), nullable=False),
        sa.Column("display_name", sa.String(128)),
        sa.Column("avatar_url", sa.String(512)),
        sa.Column("polymarket_proxy_address", sa.String(64)),
        sa.Column("last_login_at", sa.DateTime(timezone=True)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id", name="pk_users"),
        sa.UniqueConstraint("auth_identifier", name="uq_users_auth_identifier"),
        sa.UniqueConstraint("polymarket_proxy_address", name="uq_users_polymarket_proxy_address"),
    )
    op.create_index("ix_users_auth_identifier", "users", ["auth_identifier"])
    op.create_index("ix_users_polymarket_proxy_address", "users", ["polymarket_proxy_address"])

    # ---- markets ----
    op.create_table(
        "markets",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("source", sa.String(16), nullable=False),
        sa.Column("external_id", sa.String(128), nullable=False),
        sa.Column("slug", sa.String(256)),
        sa.Column("question", sa.String(512), nullable=False),
        sa.Column("description", sa.String()),
        sa.Column("category", sa.String(16), nullable=False, server_default="other"),
        sa.Column("status", sa.String(16), nullable=False, server_default="active"),
        sa.Column("yes_price", sa.Float()),
        sa.Column("no_price", sa.Float()),
        sa.Column("volume_24h", sa.Numeric(20, 2), server_default="0"),
        sa.Column("volume_total", sa.Numeric(20, 2), server_default="0"),
        sa.Column("liquidity", sa.Numeric(20, 2), server_default="0"),
        sa.Column("end_date", sa.DateTime(timezone=True)),
        sa.Column("resolved_outcome", sa.Boolean()),
        sa.Column("raw", sa.JSON()),
        sa.Column("last_synced_at", sa.DateTime(timezone=True)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id", name="pk_markets"),
    )
    op.create_index("ix_markets_source_external", "markets", ["source", "external_id"], unique=True)
    op.create_index("ix_markets_active_volume", "markets", ["status", "volume_24h"])
    op.create_index("ix_markets_end_date", "markets", ["end_date"])

    # ---- market_snapshots ----
    op.create_table(
        "market_snapshots",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("market_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("timestamp", sa.DateTime(timezone=True), nullable=False),
        sa.Column("yes_price", sa.Float(), nullable=False),
        sa.Column("volume", sa.Numeric(20, 2), server_default="0"),
        sa.ForeignKeyConstraint(["market_id"], ["markets.id"], name="fk_market_snapshots_market_id_markets", ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id", name="pk_market_snapshots"),
    )
    op.create_index("ix_snapshots_market_time", "market_snapshots", ["market_id", "timestamp"])
    op.create_index("ix_market_snapshots_timestamp", "market_snapshots", ["timestamp"])

    # ---- ingested_events ----
    op.create_table(
        "ingested_events",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("source", sa.String(16), nullable=False),
        sa.Column("external_id", sa.String(256), nullable=False),
        sa.Column("url", sa.String(1024)),
        sa.Column("title", sa.String(512)),
        sa.Column("body", sa.String()),
        sa.Column("author", sa.String(256)),
        sa.Column("published_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("engagement", sa.JSON()),
        sa.Column("velocity_score", sa.Float()),
        sa.Column("sentiment_score", sa.Float()),
        sa.Column("classified_categories", postgresql.ARRAY(sa.String(32))),
        sa.Column("classified_entities", postgresql.ARRAY(sa.String(128))),
        sa.Column("embedding_processed", sa.Boolean(), server_default=sa.false(), nullable=False),
        sa.Column("embedding_id", sa.String(64)),
        sa.Column("raw", sa.JSON()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id", name="pk_ingested_events"),
    )
    op.create_index("ix_events_source_external", "ingested_events", ["source", "external_id"], unique=True)
    op.create_index("ix_events_published_velocity", "ingested_events", ["published_at", "velocity_score"])
    op.create_index("ix_ingested_events_source", "ingested_events", ["source"])
    op.create_index("ix_ingested_events_published_at", "ingested_events", ["published_at"])
    op.create_index("ix_ingested_events_embedding_processed", "ingested_events", ["embedding_processed"])

    # ---- signals ----
    op.create_table(
        "signals",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("market_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("direction", sa.String(8), nullable=False),
        sa.Column("status", sa.String(16), nullable=False, server_default="active"),
        sa.Column("market_probability", sa.Float(), nullable=False),
        sa.Column("ai_probability", sa.Float(), nullable=False),
        sa.Column("edge_pp", sa.Float(), nullable=False),
        sa.Column("confidence", sa.Float(), nullable=False),
        sa.Column("reasoning", sa.String(), nullable=False),
        sa.Column("evidence", sa.JSON(), nullable=False),
        sa.Column("source_event_ids", postgresql.ARRAY(postgresql.UUID(as_uuid=True))),
        sa.Column("expires_at", sa.DateTime(timezone=True)),
        sa.Column("invalidated_reason", sa.String(256)),
        sa.Column("was_correct", sa.Boolean()),
        sa.Column("realized_pnl_pp", sa.Float()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["market_id"], ["markets.id"], name="fk_signals_market_id_markets", ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id", name="pk_signals"),
    )
    op.create_index("ix_signals_status_confidence", "signals", ["status", "confidence"])
    op.create_index("ix_signals_market_active", "signals", ["market_id", "status"])
    op.create_index("ix_signals_status", "signals", ["status"])

    # ---- bots ----
    op.create_table(
        "bots",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(128), nullable=False),
        sa.Column("strategy", sa.String(32), nullable=False),
        sa.Column("status", sa.String(16), nullable=False, server_default="paused"),
        sa.Column("capital_allocated", sa.Numeric(20, 2), nullable=False),
        sa.Column("max_position_usd", sa.Numeric(20, 2), nullable=False),
        sa.Column("stop_loss_pct", sa.Float(), server_default="15"),
        sa.Column("take_profit_pct", sa.Float(), server_default="50"),
        sa.Column("categories", sa.JSON()),
        sa.Column("sources", sa.JSON()),
        sa.Column("min_liquidity", sa.Numeric(20, 2), server_default="50000"),
        sa.Column("min_confidence", sa.Float(), server_default="70"),
        sa.Column("min_edge_pp", sa.Float(), server_default="12"),
        sa.Column("signal_weights", sa.JSON(), nullable=False),
        sa.Column("custom_logic", sa.JSON()),
        sa.Column("pnl_24h_pct", sa.Float(), server_default="0"),
        sa.Column("pnl_total_usd", sa.Numeric(20, 2), server_default="0"),
        sa.Column("win_rate", sa.Float(), server_default="0"),
        sa.Column("open_positions", sa.Integer(), server_default="0"),
        sa.Column("total_trades", sa.Integer(), server_default="0"),
        sa.Column("auto_execute", sa.Boolean(), server_default=sa.true()),
        sa.Column("last_run_at", sa.DateTime(timezone=True)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], name="fk_bots_user_id_users", ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id", name="pk_bots"),
    )
    op.create_index("ix_bots_user_status", "bots", ["user_id", "status"])

    # ---- positions ----
    op.create_table(
        "positions",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("bot_id", postgresql.UUID(as_uuid=True)),
        sa.Column("market_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("signal_id", postgresql.UUID(as_uuid=True)),
        sa.Column("direction", sa.String(8), nullable=False),
        sa.Column("status", sa.String(16), nullable=False, server_default="pending"),
        sa.Column("size_usd", sa.Numeric(20, 2), nullable=False),
        sa.Column("shares", sa.Numeric(20, 6), server_default="0"),
        sa.Column("entry_price", sa.Float(), nullable=False),
        sa.Column("current_price", sa.Float()),
        sa.Column("exit_price", sa.Float()),
        sa.Column("unrealized_pnl_usd", sa.Numeric(20, 2), server_default="0"),
        sa.Column("realized_pnl_usd", sa.Numeric(20, 2)),
        sa.Column("stop_loss_price", sa.Float()),
        sa.Column("take_profit_price", sa.Float()),
        sa.Column("tx_hash_open", sa.String(128)),
        sa.Column("tx_hash_close", sa.String(128)),
        sa.Column("opened_at", sa.DateTime(timezone=True)),
        sa.Column("closed_at", sa.DateTime(timezone=True)),
        sa.Column("error_message", sa.String(512)),
        sa.Column("meta", sa.JSON()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], name="fk_positions_user_id_users", ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["bot_id"], ["bots.id"], name="fk_positions_bot_id_bots", ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["market_id"], ["markets.id"], name="fk_positions_market_id_markets", ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["signal_id"], ["signals.id"], name="fk_positions_signal_id_signals", ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id", name="pk_positions"),
    )
    op.create_index("ix_positions_user_status", "positions", ["user_id", "status"])
    op.create_index("ix_positions_bot_status", "positions", ["bot_id", "status"])

    # ---- whale_wallets ----
    op.create_table(
        "whale_wallets",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("address", sa.String(64), nullable=False),
        sa.Column("label", sa.String(128)),
        sa.Column("tag", sa.String(32), server_default="whale"),
        sa.Column("total_volume_usd", sa.Numeric(20, 2), server_default="0"),
        sa.Column("realized_pnl_usd", sa.Numeric(20, 2), server_default="0"),
        sa.Column("win_rate", sa.Float(), server_default="0"),
        sa.Column("total_positions", sa.Integer(), server_default="0"),
        sa.Column("confidence_score", sa.Float(), server_default="50"),
        sa.Column("is_active", sa.Boolean(), server_default=sa.true()),
        sa.Column("last_activity_at", sa.DateTime(timezone=True)),
        sa.Column("meta", sa.JSON()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id", name="pk_whale_wallets"),
        sa.UniqueConstraint("address", name="uq_whale_wallets_address"),
    )
    op.create_index("ix_whale_wallets_address", "whale_wallets", ["address"])
    op.create_index("ix_whale_wallets_is_active", "whale_wallets", ["is_active"])

    # ---- whale_positions ----
    op.create_table(
        "whale_positions",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("whale_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("market_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("direction", sa.String(8), nullable=False),
        sa.Column("size_usd", sa.Numeric(20, 2), nullable=False),
        sa.Column("entry_price", sa.Float(), nullable=False),
        sa.Column("current_price", sa.Float()),
        sa.Column("pnl_pct", sa.Float()),
        sa.Column("first_seen_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("last_updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("closed_at", sa.DateTime(timezone=True)),
        sa.ForeignKeyConstraint(["whale_id"], ["whale_wallets.id"], name="fk_whale_positions_whale_id_whale_wallets", ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["market_id"], ["markets.id"], name="fk_whale_positions_market_id_markets", ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id", name="pk_whale_positions"),
    )
    op.create_index("ix_whale_positions_whale_market", "whale_positions", ["whale_id", "market_id"])
    op.create_index("ix_whale_positions_first_seen", "whale_positions", ["first_seen_at"])


def downgrade() -> None:
    op.drop_table("whale_positions")
    op.drop_table("whale_wallets")
    op.drop_table("positions")
    op.drop_table("bots")
    op.drop_table("signals")
    op.drop_table("ingested_events")
    op.drop_table("market_snapshots")
    op.drop_table("markets")
    op.drop_table("users")
