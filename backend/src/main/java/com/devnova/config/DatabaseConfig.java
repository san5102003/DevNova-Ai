package com.devnova.config;

import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import javax.sql.DataSource;
import java.net.URI;

@Configuration
public class DatabaseConfig {

    @Value("${SPRING_DATASOURCE_URL:jdbc:postgresql://localhost:5432/devnova}")
    private String rawUrl;

    @Value("${SPRING_DATASOURCE_USERNAME:devnova}")
    private String username;

    @Value("${SPRING_DATASOURCE_PASSWORD:devnovapassword}")
    private String password;

    @Bean
    public DataSource dataSource() {
        HikariConfig config = new HikariConfig();
        config.setDriverClassName("org.postgresql.Driver");

        try {
            String url = rawUrl.trim();
            // Handle postgres:// or postgresql:// or jdbc:postgresql:// with user info
            if (url.startsWith("postgres://") || url.startsWith("postgresql://")) {
                URI uri = new URI(url.replace("postgres://", "http://").replace("postgresql://", "http://"));
                String host = uri.getHost();
                int port = uri.getPort() > 0 ? uri.getPort() : 5432;
                String path = uri.getPath();
                
                if (uri.getUserInfo() != null && uri.getUserInfo().contains(":")) {
                    String[] userParts = uri.getUserInfo().split(":", 2);
                    config.setUsername(userParts[0]);
                    config.setPassword(userParts[1]);
                } else {
                    config.setUsername(username);
                    config.setPassword(password);
                }
                
                config.setJdbcUrl("jdbc:postgresql://" + host + ":" + port + path + "?sslmode=require");
            } else if (url.contains("@")) {
                // e.g. jdbc:postgresql://user:pass@host:5432/db
                String cleanUrl = url.replace("jdbc:postgresql://", "");
                String userInfo = cleanUrl.substring(0, cleanUrl.indexOf("@"));
                String hostAndDb = cleanUrl.substring(cleanUrl.indexOf("@") + 1);

                if (userInfo.contains(":")) {
                    String[] userParts = userInfo.split(":", 2);
                    config.setUsername(userParts[0]);
                    config.setPassword(userParts[1]);
                } else {
                    config.setUsername(username);
                    config.setPassword(password);
                }

                if (!hostAndDb.contains("?")) {
                    hostAndDb += "?sslmode=require";
                }
                config.setJdbcUrl("jdbc:postgresql://" + hostAndDb);
            } else {
                config.setJdbcUrl(url);
                config.setUsername(username);
                config.setPassword(password);
            }
        } catch (Exception e) {
            config.setJdbcUrl(rawUrl);
            config.setUsername(username);
            config.setPassword(password);
        }

        config.setMaximumPoolSize(10);
        config.setMinimumIdle(2);
        config.setIdleTimeout(30000);
        config.setConnectionTimeout(20000);

        return new HikariDataSource(config);
    }
}
