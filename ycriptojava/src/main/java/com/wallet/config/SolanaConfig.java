package com.wallet.config;

import lombok.Getter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.p2p.solanaj.rpc.RpcClient;
import org.springframework.web.reactive.function.client.WebClient;

@Configuration
@Getter
public class SolanaConfig {
    
    @Value("${solana.rpc-url}")
    private String rpcUrl;
    
    @Value("${solana.ws-url}")
    private String wsUrl;
    
    @Value("${solana.network}")
    private String network;
    
    @Value("${solana.jupiter-api-url}")
    private String jupiterApiUrl;
    
    @Bean
    public RpcClient solanaRpcClient() {
        return new RpcClient(rpcUrl);
    }
    
    @Bean
    public WebClient jupiterWebClient() {
        return WebClient.builder()
                .baseUrl(jupiterApiUrl)
                .build();
    }
}
