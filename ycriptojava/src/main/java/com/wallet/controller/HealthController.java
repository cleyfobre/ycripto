package com.wallet.controller;

import com.wallet.config.SolanaConfig;
import lombok.RequiredArgsConstructor;
import org.p2p.solanaj.rpc.RpcClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class HealthController {
    
    private final SolanaConfig solanaConfig;
    private final RpcClient solanaRpcClient;
    
    @GetMapping("/health")
    public Map<String, Object> health() {
        Map<String, Object> response = new HashMap<>();
        response.put("status", "UP");
        response.put("network", solanaConfig.getNetwork());
        response.put("rpcUrl", solanaConfig.getRpcUrl());
        
        try {
            // Solana 연결 테스트
            Long slot = solanaRpcClient.getApi().getSlot();
            response.put("solanaConnected", true);
            response.put("currentSlot", slot);
        } catch (Exception e) {
            response.put("solanaConnected", false);
            response.put("error", e.getMessage());
        }
        
        return response;
    }
}
