package com.devnova.service;

import com.devnova.dto.JwtResponse;
import com.devnova.dto.LoginRequest;
import com.devnova.dto.SignupRequest;
import com.devnova.model.User;
import com.devnova.repository.UserRepository;
import com.devnova.security.jwt.JwtUtils;
import com.devnova.security.services.UserDetailsImpl;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {

    @Autowired
    private AuthenticationManager authenticationManager;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder encoder;

    @Autowired
    private JwtUtils jwtUtils;

    @Transactional
    public void registerUser(SignupRequest signupRequest) {
        if (userRepository.existsByUsername(signupRequest.getUsername())) {
            throw new IllegalArgumentException("Error: Username is already taken!");
        }

        if (userRepository.existsByEmail(signupRequest.getEmail())) {
            throw new IllegalArgumentException("Error: Email is already in use!");
        }

        // Create new user's account
        User user = User.builder()
                .username(signupRequest.getUsername())
                .email(signupRequest.getEmail())
                .password(encoder.encode(signupRequest.getPassword()))
                .build();

        userRepository.save(user);
    }

    public JwtResponse authenticateUser(LoginRequest loginRequest) {
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        loginRequest.getUsernameOrEmail(),
                        loginRequest.getPassword()
                )
        );

        SecurityContextHolder.getContext().setAuthentication(authentication);
        String jwt = jwtUtils.generateJwtToken(authentication);

        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();

        return new JwtResponse(
                jwt,
                userDetails.getId(),
                userDetails.getUsername(),
                userDetails.getEmail()
        );
    }

    @Transactional
    public String generateResetOtp(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("Error: No account found with this email address."));
        
        String otp = String.format("%06d", new java.util.Random().nextInt(900000) + 100000);
        user.setResetOtp(otp);
        user.setResetOtpExpiry(java.time.LocalDateTime.now().plusMinutes(10));
        userRepository.save(user);
        return otp;
    }

    public boolean verifyResetOtp(String email, String otp) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("Error: No account found with this email address."));

        if (user.getResetOtp() == null || !user.getResetOtp().equals(otp)) {
            throw new IllegalArgumentException("Error: Invalid OTP code.");
        }

        if (user.getResetOtpExpiry() == null || user.getResetOtpExpiry().isBefore(java.time.LocalDateTime.now())) {
            throw new IllegalArgumentException("Error: OTP code has expired. Please request a new code.");
        }

        return true;
    }

    @Transactional
    public void resetPasswordWithOtp(String email, String otp, String newPassword, String confirmPassword) {
        if (newPassword == null || newPassword.length() < 6) {
            throw new IllegalArgumentException("Error: Password must be at least 6 characters long.");
        }

        if (!newPassword.equals(confirmPassword)) {
            throw new IllegalArgumentException("Error: Passwords do not match.");
        }

        verifyResetOtp(email, otp);

        User user = userRepository.findByEmail(email).get();
        user.setPassword(encoder.encode(newPassword));
        user.setResetOtp(null);
        user.setResetOtpExpiry(null);
        userRepository.save(user);
    }

    @Transactional
    public void resetPassword(String email, String newPassword) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("Error: No account found with this email address."));
        user.setPassword(encoder.encode(newPassword));
        userRepository.save(user);
    }
}
