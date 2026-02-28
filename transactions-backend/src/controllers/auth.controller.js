import * as authService from '../services/auth.service.js';
import { validateSignup, validateLogin } from '../utils/validate.js';

export async function signup(req, res, next) {
    try {
        const { name, email, password } = req.body ?? {};
        validateSignup({ name, email, password });

        const result = await authService.signup({ name: name.trim(), email, password });
        res.status(201).json(result);
    } catch (err) {
        next(err);
    }
}

export async function login(req, res, next) {
    try {
        const { email, password } = req.body ?? {};
        validateLogin({ email, password });

        const result = await authService.login({ email, password });
        res.json(result);
    } catch (err) {
        next(err);
    }
}
