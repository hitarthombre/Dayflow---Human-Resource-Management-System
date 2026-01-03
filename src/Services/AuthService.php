<?php
/**
 * Authentication Service
 * 
 * Handles user authentication, session management, and password operations.
 */

namespace HRMS\Services;

use HRMS\Repositories\UserRepository;
use HRMS\Exceptions\AuthException;

class AuthService
{
    private UserRepository $userRepository;
    
    public function __construct()
    {
        $this->userRepository = new UserRepository();
    }
    
    /**
     * Authenticate user with email and password
     */
    public function login(string $email, string $password): array
    {
        // Find user by email
        $user = $this->userRepository->findByEmail($email);
        
        if (!$user) {
            throw new AuthException('Invalid email or password');
        }
        
        // Check if user is active
        if ($user['status'] !== 'active') {
            throw new AuthException('Your account is not active. Please contact administrator.');
        }
        
        // Verify password
        if (!password_verify($password, $user['password_hash'])) {
            throw new AuthException('Invalid email or password');
        }
        
        // Get user permissions
        $permissions = $this->userRepository->getPermissions($user['role_id']);
        
        // Update last login
        $this->userRepository->updateLastLogin($user['id']);
        
        // Create session data
        $sessionData = [
            'id' => (int) $user['id'],
            'company_id' => (int) $user['company_id'],
            'role_id' => (int) $user['role_id'],
            'role_name' => $user['role_name'],
            'email' => $user['email'],
            'employee_id' => $user['employee_id'] ? (int) $user['employee_id'] : null
        ];
        
        // Store in session
        $_SESSION['user'] = $sessionData;
        $_SESSION['permissions'] = $permissions;
        
        // Return user data (without sensitive info)
        return [
            'user' => $sessionData,
            'permissions' => $permissions
        ];
    }
    
    /**
     * Logout current user
     */
    public function logout(): void
    {
        // Clear session data
        unset($_SESSION['user']);
        unset($_SESSION['permissions']);
        
        // Destroy session
        if (session_status() === PHP_SESSION_ACTIVE) {
            session_destroy();
        }
    }
    
    /**
     * Get current authenticated user
     */
    public function getCurrentUser(): ?array
    {
        if (!isset($_SESSION['user'])) {
            return null;
        }
        
        $userId = $_SESSION['user']['id'];
        $user = $this->userRepository->findWithDetails($userId);
        
        if (!$user || $user['status'] !== 'active') {
            $this->logout();
            return null;
        }
        
        // Get fresh permissions
        $permissions = $this->userRepository->getPermissions($user['role_id']);
        
        return [
            'user' => [
                'id' => (int) $user['id'],
                'company_id' => (int) $user['company_id'],
                'role_id' => (int) $user['role_id'],
                'role_name' => $user['role_name'],
                'email' => $user['email'],
                'employee_id' => $user['employee_id'] ? (int) $user['employee_id'] : null,
                'first_name' => $user['first_name'],
                'last_name' => $user['last_name'],
                'employee_code' => $user['employee_code'],
                'last_login' => $user['last_login']
            ],
            'permissions' => $permissions
        ];
    }
    
    /**
     * Check if user is authenticated
     */
    public function isAuthenticated(): bool
    {
        return isset($_SESSION['user']) && !empty($_SESSION['user']['id']);
    }
    
    /**
     * Hash a password
     */
    public function hashPassword(string $password): string
    {
        return password_hash($password, PASSWORD_BCRYPT, ['cost' => 10]);
    }
    
    /**
     * Verify a password against a hash
     */
    public function verifyPassword(string $password, string $hash): bool
    {
        return password_verify($password, $hash);
    }
}
