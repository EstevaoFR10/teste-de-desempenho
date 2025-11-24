/**
 * LOAD TEST (Teste de Carga)
 * 
 * Objetivo: Simular uma carga esperada de 50 usuários simultâneos durante uma promoção
 * Cenário: Rampa de 0 a 50 usuários, mantém por 2 minutos, depois desce
 * Endpoint: POST /checkout/simple (I/O Bound)
 * SLA: p95 < 500ms e taxa de erros < 1%
 */

import http from 'k6/http';
import { check, sleep } from 'k6';

// Configuração do teste com stages (fases)
export const options = {
    stages: [
        { duration: '1m', target: 50 },   // Ramp-up: 0 a 50 usuários em 1 minuto
        { duration: '2m', target: 50 },   // Platô: Manter 50 usuários por 2 minutos
        { duration: '30s', target: 0 },   // Ramp-down: 50 a 0 usuários em 30 segundos
    ],
    
    thresholds: {
        http_req_failed: ['rate<0.01'],      // Taxa de erros < 1%
        http_req_duration: ['p(95)<500'],    // p95 da latência < 500ms
        http_req_duration: ['p(99)<1000'],   // p99 da latência < 1s
    },
};

const BASE_URL = 'http://localhost:3000';

export default function () {
    // Payload para o checkout simples
    const payload = JSON.stringify({
        userId: Math.floor(Math.random() * 1000),
        items: [
            { id: 1, name: 'Produto A', price: 29.90 },
            { id: 2, name: 'Produto B', price: 49.90 }
        ],
        total: 79.80
    });

    const params = {
        headers: {
            'Content-Type': 'application/json',
        },
    };

    // Requisição POST para /checkout/simple
    const response = http.post(`${BASE_URL}/checkout/simple`, payload, params);
    
    // Verificações
    check(response, {
        'status é 201': (r) => r.status === 201,
        'resposta contém status APPROVED': (r) => {
            try {
                const body = JSON.parse(r.body);
                return body.status === 'APPROVED';
            } catch (e) {
                return false;
            }
        },
        'tempo de resposta < 500ms': (r) => r.timings.duration < 500,
    });
    
    sleep(1); // Simula tempo de "pensar" do usuário
}
