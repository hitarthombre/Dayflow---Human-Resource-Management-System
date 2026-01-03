<?php
/**
 * Authentication Controller
 * 
 * Handles login, logout, and current user endpoints.
 */

namespace HRMS\Controllers;

use HRMS\Core\Request;
use HRMS\Core\Response;
use HRMS\Services\AuthService;
use HRMS\Exceptions\AuthException;
use HRMS\Exceptions\ValidationException;

class AuthController
{
    private AuthService $authService;
    
    public function __construct()
    {
        $this->authService = new AuthService();
    }
    
    /**
     * POST /api/auth/login
     * 
     * Authenticate user and create session
     */
    public function login(Request $request): Response
    {
        $email = $request->input('email');
        $password = $request->input('password');
        
        // Validate input
        $errors = [];
        if (empty($email)) {
            $errors['email'] = 'Email is required';
        } elseif (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $errors['email'] = 'Invalid email format';
        }
        
        if (empty($password)) {
            $errors['password'] = 'Password is required';
        }
        
        if (!empty($errors)) {
            return Response::validationError($errors);
        }
        
        try {
            $result = $this->authService->login($email, $password);
            
            return Response::success($result, 'Login successful');
            
        } catch (AuthException $e) {
            return Response::unauthorized($e->getMessage());
        }
    }
    
    /**
     * POST /api/auth/logout
     * 
     * Logout current user and destroy session
     */
    public function logout(Request $request): Response
    {
        $this->authService->logout();
        
        return Response::success(null, 'Logout successful');
    }
    
    /**
     * GET /api/auth/me
     * 
     * Get current authenticated user details
     */
    public function me(Request $request): Response
    {
        $userData = $this->authService->getCurrentUser();
        
        if (!$userData) {
            return Response::unauthorized('Not authenticated');
        }
        
        return Response::success($userData);
    }
}
