package com.devnova.controller;

import com.devnova.dto.JwtResponse;
import com.devnova.dto.LoginRequest;
import com.devnova.dto.MessageResponse;
import com.devnova.dto.SignupRequest;
import com.devnova.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @Autowired
    private AuthService authService;

    @PostMapping("/signin")
    public ResponseEntity<?> authenticateUser(@Valid @RequestBody LoginRequest loginRequest) {
        try {
            JwtResponse jwtResponse = authService.authenticateUser(loginRequest);
            return ResponseEntity.ok(jwtResponse);
        } catch (Exception e) {
            return ResponseEntity.status(401).body(new MessageResponse("Error: Invalid username/email or password!"));
        }
    }

    @PostMapping("/signup")
    public ResponseEntity<?> registerUser(@Valid @RequestBody SignupRequest signUpRequest) {
        try {
            authService.registerUser(signUpRequest);
            return ResponseEntity.ok(new MessageResponse("User registered successfully!"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(new MessageResponse(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(new MessageResponse("Error: Internal server error during registration."));
        }
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<?> forgotPassword(@RequestBody java.util.Map<String, String> request) {
        try {
            String email = request.get("email");
            if (email == null || email.isBlank()) {
                return ResponseEntity.badRequest().body(new MessageResponse("Error: Email is required."));
            }
            String otp = authService.generateResetOtp(email);
            java.util.Map<String, String> response = new java.util.HashMap<>();
            response.put("message", "Reset OTP code sent to your email.");
            response.put("otp", otp); // Returned for dev testing convenience
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(new MessageResponse(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(new MessageResponse("Error: Failed to process forgot password request."));
        }
    }

    @PostMapping("/verify-otp")
    public ResponseEntity<?> verifyOtp(@RequestBody java.util.Map<String, String> request) {
        try {
            String email = request.get("email");
            String otp = request.get("otp");
            if (email == null || email.isBlank() || otp == null || otp.isBlank()) {
                return ResponseEntity.badRequest().body(new MessageResponse("Error: Email and OTP are required."));
            }
            authService.verifyResetOtp(email, otp);
            return ResponseEntity.ok(new MessageResponse("OTP verified successfully."));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(new MessageResponse(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(new MessageResponse("Error: Failed to verify OTP."));
        }
    }

    @PostMapping("/reset-password-otp")
    public ResponseEntity<?> resetPasswordWithOtp(@RequestBody java.util.Map<String, String> request) {
        try {
            String email = request.get("email");
            String otp = request.get("otp");
            String newPassword = request.get("newPassword");
            String confirmPassword = request.get("confirmPassword");
            
            if (email == null || email.isBlank() || otp == null || otp.isBlank() || newPassword == null || newPassword.isBlank()) {
                return ResponseEntity.badRequest().body(new MessageResponse("Error: Email, OTP, and new password are required."));
            }
            
            authService.resetPasswordWithOtp(email, otp, newPassword, confirmPassword);
            return ResponseEntity.ok(new MessageResponse("Password updated successfully! Please sign in with your new password."));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(new MessageResponse(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(new MessageResponse("Error: Failed to reset password."));
        }
    }

    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(@RequestBody java.util.Map<String, String> request) {
        try {
            String email = request.get("email");
            String newPassword = request.get("newPassword");
            if (email == null || email.isBlank() || newPassword == null || newPassword.isBlank()) {
                return ResponseEntity.badRequest().body(new MessageResponse("Error: Email and new password are required."));
            }
            if (newPassword.length() < 6) {
                return ResponseEntity.badRequest().body(new MessageResponse("Error: Password must be at least 6 characters."));
            }
            authService.resetPassword(email, newPassword);
            return ResponseEntity.ok(new MessageResponse("Password reset successfully! Please sign in with your new password."));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(new MessageResponse(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(new MessageResponse("Error: Failed to reset password."));
        }
    }
}
