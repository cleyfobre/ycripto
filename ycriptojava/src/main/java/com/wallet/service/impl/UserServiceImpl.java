package com.wallet.service.impl;

import com.wallet.domain.entity.User;
import com.wallet.domain.repository.UserRepository;
import com.wallet.dto.UserRegisterRequest;
import com.wallet.service.UserService;
import com.wallet.service.WalletService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class UserServiceImpl implements UserService {
    
    private final UserRepository userRepository;
    private final WalletService walletService;
    
    @Override
    @Transactional
    public User registerUser(UserRegisterRequest request) {
        log.info("Registering user: {}", request.getEmail());
        
        // 이메일 중복 체크
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new RuntimeException("이미 존재하는 이메일입니다: " + request.getEmail());
        }
        
        // 사용자 생성
        User user = User.builder()
                .email(request.getEmail())
                .passwordHash(request.getPassword())  // TODO: BCrypt 암호화 필요
                .name(request.getName())
                .phone(request.getPhone())
                .kycStatus(User.KycStatus.PENDING)
                .status(User.UserStatus.ACTIVE)
                .build();
        
        user = userRepository.save(user);
        
        // 자동으로 지갑 생성
        walletService.createWallet(user.getId());
        
        log.info("User registered successfully. ID: {}", user.getId());
        return user;
    }
    
    @Override
    @Transactional(readOnly = true)
    public User getUserById(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다: " + userId));
    }
    
    @Override
    @Transactional(readOnly = true)
    public User getUserByEmail(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다: " + email));
    }
}
