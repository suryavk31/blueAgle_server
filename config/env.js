'use strict';

/**
 * config/env.js — Centralized Environment Loader
 * ─────────────────────────────────────────────────────────────────────────────
 * This module MUST be required at the very top of server.js, before any other
 * module that reads process.env.
 *
 * Strategy:
 *   NODE_ENV=production  → loads .env
 *   NODE_ENV=development → loads .env.local (falls back to .env if missing)
 *   (default)           → treated as development
 *
 * Scattered require('dotenv').config() calls in individual modules are
 * benign after this runs (dotenv is idempotent — it will not overwrite
 * already-set variables).
 */

const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

const NODE_ENV = process.env.NODE_ENV || 'development';
const serverRoot = path.resolve(__dirname, '..');

if (NODE_ENV === 'production') {
    // ── Production: load .env if file exists (local testing / VPS), otherwise use platform env (Render/Railway/etc) ──
    const prodEnvPath = path.join(serverRoot, '.env');
    if (fs.existsSync(prodEnvPath)) {
        dotenv.config({ path: prodEnvPath });
        console.log('[ENV] Loaded: .env (production file)');
    } else {
        console.log('[ENV] .env file not found on disk — using environment variables from cloud host (Render/Railway/AWS).');
    }
} else {
    // ── Development: prefer .env.local, fallback to .env ─────────────────────
    const localEnvPath = path.join(serverRoot, '.env.local');
    const defaultEnvPath = path.join(serverRoot, '.env');

    if (fs.existsSync(localEnvPath)) {
        dotenv.config({ path: localEnvPath });
        console.log('[ENV] Loaded: .env.local (development)');
    } else if (fs.existsSync(defaultEnvPath)) {
        dotenv.config({ path: defaultEnvPath });
        console.warn('[ENV] Warning: .env.local not found — falling back to .env for development.');
        console.warn('[ENV] Create server/.env.local for proper dev/prod separation.');
    } else {
        console.warn('[ENV] Warning: No .env or .env.local file found. Using system environment variables only.');
    }
}

// ── Ensure NODE_ENV is always set in process.env ─────────────────────────────
if (!process.env.NODE_ENV) {
    process.env.NODE_ENV = NODE_ENV;
}

module.exports = { NODE_ENV: process.env.NODE_ENV };
