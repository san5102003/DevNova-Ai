package com.devnova.config;

import com.devnova.websocket.InteractiveExecutionHandler;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;

@Configuration
@EnableWebSocket
public class WebSocketConfig implements WebSocketConfigurer {

    @Autowired
    private InteractiveExecutionHandler interactiveExecutionHandler;

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        registry.addHandler(interactiveExecutionHandler, "/ws/execute")
                .setAllowedOrigins("*"); // Allow all origins for dev simplicity
    }
}
