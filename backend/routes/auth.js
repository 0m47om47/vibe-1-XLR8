const express = require("express");
const { ok, asyncRoute, readJsonObject } = require("../lib/http");
const { createSession, destroySession } = require("../lib/session");
const { requireAuth, getCurrentUser } = require("../lib/auth");
const { validateLogin, validateRegister } = require("../lib/validation");
const { toPublicUser } = require("../models/User");
const { registerUser, authenticate } = require("../services/authService");

const router = express.Router();

/** POST /api/auth/register — creates a STUDENT or EMPLOYEE account and logs it in. */
router.post(
  "/register",
  asyncRoute(async (req, res) => {
    const input = validateRegister(readJsonObject(req));
    const user = await registerUser(input);
    await createSession(res, user._id);
    ok(res, { user: toPublicUser(user) }, 201);
  }),
);

/** POST /api/auth/login — verifies credentials and sets the session cookie. */
router.post(
  "/login",
  asyncRoute(async (req, res) => {
    const input = validateLogin(readJsonObject(req));
    const user = await authenticate(input);
    await createSession(res, user._id);
    ok(res, { user: toPublicUser(user) });
  }),
);

/** POST /api/auth/logout — revokes the server-side session and clears the cookie. */
router.post(
  "/logout",
  asyncRoute(async (req, res) => {
    await destroySession(req, res);
    ok(res, { loggedOut: true });
  }),
);

/** GET /api/auth/me — the logged-in user (401 when not logged in). */
router.get(
  "/me",
  asyncRoute(async (req, res) => {
    const user = await requireAuth(req);
    ok(res, { user: toPublicUser(user) });
  }),
);

/**
 * GET /api/auth/session — the logged-in user, or `{ user: null }` (always 200).
 * Lets the UI check "am I logged in?" without a 401 on every logged-out page view.
 * Use GET /api/auth/me when a session is required.
 */
router.get(
  "/session",
  asyncRoute(async (req, res) => {
    const user = await getCurrentUser(req);
    ok(res, { user: user ? toPublicUser(user) : null });
  }),
);

module.exports = router;
