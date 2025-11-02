package com.wallet.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

@Data
public class InternalTransferRequest {
    
    @NotNull(message = "받는 사용자 ID는 필수입니다")
    private Long toUserId;
    
    @NotBlank(message = "금액은 필수입니다")
    @Pattern(regexp = "^\\d+(\\.\\d+)?$", message = "올바른 금액 형식이 아닙니다")
    private String amount;
    
    @NotBlank(message = "토큰 심볼은 필수입니다")
    private String tokenSymbol;
}
