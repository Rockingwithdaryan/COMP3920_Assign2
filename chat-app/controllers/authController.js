const bcrypt = require('bcrypt');
const Joi = require('joi');
const db = require('../config/db');

const passwordSchema = Joi.string()
  .min(10)
  .pattern(/[A-Z]/, 'uppercase')
  .pattern(/[a-z]/, 'lowercase')
  .pattern(/[0-9]/, 'number')
  .pattern(/[^A-Za-z0-9]/, 'symbol')
  .required();

const signupSchema = Joi.object({
  username: Joi.string().alphanum().min(3).max(50).required(),
  email: Joi.string().email({ tlds: { allow: false } }).required(),
  password: passwordSchema,
  confirm_password: Joi.any()
});

exports.getLogin = (req, res) => {
  if (req.session.user) return res.redirect('/groups');
  res.render('auth/login', { error: null });
};

exports.postLogin = async (req, res) => {
  const { username, password } = req.body;
  try {
    const [rows] = await db.query('SELECT * FROM users WHERE username = ?', [username]);
    if (rows.length === 0) {
      return res.render('auth/login', { error: 'Invalid username or password.' });
    }
    const user = rows[0];
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.render('auth/login', { error: 'Invalid username or password.' });
    }
    req.session.user = { id: user.id, username: user.username, email: user.email };
    res.redirect('/groups');
  } catch (err) {
    console.error(err);
    res.render('auth/login', { error: 'Server error. Please try again.' });
  }
};

exports.getSignup = (req, res) => {
  if (req.session.user) return res.redirect('/groups');
  res.render('auth/signup', { error: null });
};

exports.postSignup = async (req, res) => {
  const { username, email, password, confirm_password } = req.body;

  if (password !== confirm_password) {
    return res.render('auth/signup', { error: 'Passwords do not match.' });
  }

  const { error } = signupSchema.validate({ username, email, password });
  if (error) {
    return res.render('auth/signup', { error: error.details[0].message });
  }

  try {
    const [existing] = await db.query(
      'SELECT id FROM users WHERE username = ? OR email = ?', [username, email]
    );
    if (existing.length > 0) {
      return res.render('auth/signup', { error: 'Username or email already taken.' });
    }

    const hash = await bcrypt.hash(password, 12);
    const [result] = await db.query(
      'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)',
      [username, email, hash]
    );

    req.session.user = { id: result.insertId, username, email };
    res.redirect('/groups');
  } catch (err) {
    console.error(err);
    res.render('auth/signup', { error: 'Server error. Please try again.' });
  }
};

exports.logout = (req, res) => {
  req.session.destroy(() => res.redirect('/auth/login'));
};
