package com.wallet.service;

import com.wallet.domain.entity.User;
import com.wallet.dto.UserRegisterRequest;

public interface UserService {
    
    /**
     * 사용자 등록 (자동으로 지갑도 생성)
     */
    User registerUser(UserRegisterRequest request);
    
    /**
     * 사용자 조회
     */
    User getUserById(Long userId);
    
    /**
     * 이메일로 사용자 조회
     */
    User getUserByEmail(String email);
}
