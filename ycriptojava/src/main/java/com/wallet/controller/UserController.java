package com.wallet.controller;

import com.wallet.domain.entity.User;
import com.wallet.dto.ApiResponse;
import com.wallet.dto.UserRegisterRequest;
import com.wallet.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@Tag(name = "사용자 관리", description = "사용자 등록 및 조회 API")
@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {
    
    private final UserService userService;
    
    @Operation(
        summary = "사용자 등록",
        description = "새로운 사용자를 등록합니다. 등록 시 자동으로 Solana 지갑이 생성됩니다."
    )
    @PostMapping("/register")
    public ApiResponse<User> register(@Valid @RequestBody UserRegisterRequest request) {
        User user = userService.registerUser(request);
        return ApiResponse.success("회원가입이 완료되었습니다", user);
    }
    
    @Operation(
        summary = "사용자 정보 조회",
        description = "사용자 ID로 사용자 정보를 조회합니다."
    )
    @GetMapping("/{userId}")
    public ApiResponse<User> getUser(@PathVariable Long userId) {
        User user = userService.getUserById(userId);
        return ApiResponse.success(user);
    }
    
    @Operation(
        summary = "이메일로 사용자 조회",
        description = "이메일 주소로 사용자 정보를 조회합니다."
    )
    @GetMapping("/email/{email}")
    public ApiResponse<User> getUserByEmail(@PathVariable String email) {
        User user = userService.getUserByEmail(email);
        return ApiResponse.success(user);
    }
}
