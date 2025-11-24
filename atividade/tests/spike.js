/**
 * SPIKE TEST (Teste de Pico)
 * 
 * Objetivo: Simular um pico súbito de tráfego (Flash Sale / Venda de Ingressos)
 * Cenário: Carga baixa normal, pico repentino para 300 usuários, depois volta ao normal
 * Endpoint: POST /checkout/simple (I/O Bound)
 * Meta: Verificar como a aplicação se comporta com mudanças abruptas de carga
 */

import http from 'k6/http';
import { check, sleep } from 'k6';

// Configuração do teste com pico repentino
export const options = {
    stages: [
        { duration: '30s', target: 10 },   // Carga normal: 10 usuários por 30s
        { duration: '10s', target: 300 },  // SPIKE: Salto imediato para 300 usuários
        { duration: '1m', target: 300 },   // Manter pico por 1 minuto
        { duration: '10s', target: 10 },   // Queda imediata para 10 usuários
        { duration: '30s', target: 10 },   // Recuperação: manter 10 usuários
        { duration: '10s', target: 0 },    // Finalizar
    ],
    
    thresholds: {
        http_req_failed: ['rate<0.05'],      // Aceitar até 5% de falhas durante o pico
        http_req_duration: ['p(95)<2000'],   // p95 < 2s (mais permissivo devido ao pico)
        http_req_duration: ['p(99)<5000'],   // p99 < 5s
    },
};

const BASE_URL = 'http://localhost:3000';

export default function () {
    // Payload para o checkout simples (Flash Sale)
    const payload = JSON.stringify({
        userId: Math.floor(Math.random() * 50000), // Simula muitos usuários diferentes
        items: [
            { id: 999, name: 'OFERTA RELÂMPAGO - Produto Limitado', price: 9.90 }
        ],
        total: 9.90,
        timestamp: new Date().toISOString()
    });

    const params = {
        headers: {
            'Content-Type': 'application/json',
        },
        timeout: '30s',
    };

    // Requisição POST para /checkout/simple
    const response = http.post(`${BASE_URL}/checkout/simple`, payload, params);
    
    // Verificações
    const checkResult = check(response, {
        'status é 201 ou 503 (sobrecarga)': (r) => r.status === 201 || r.status === 503,
        'resposta recebida (não timeout)': (r) => r.status !== 0,
        'tempo de resposta < 5s': (r) => r.timings.duration < 5000,
    });
    
    // Indicador visual do estágio atual
    if (__ITER === 0) {
        if (__VU <= 10) {
            console.log(`📊 Fase: CARGA NORMAL (${__VU} VUs)`);
        } else if (__VU > 10 && __VU <= 300) {
            console.log(`🚀 Fase: PICO DETECTADO (${__VU} VUs)`);
        }
    }
    
    sleep(0.3); // Intervalo curto para maximizar o impacto do pico
}
