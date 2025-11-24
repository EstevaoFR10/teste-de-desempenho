/**
 * STRESS TEST (Teste de Estresse)
 * 
 * Objetivo: Encontrar o ponto de ruptura (breaking point) da aplicação
 * Cenário: Escalada agressiva de usuários realizando operações pesadas de CPU
 * Endpoint: POST /checkout/crypto (CPU Bound - bcrypt hashing)
 * Meta: Identificar quando os tempos de resposta explodem ou ocorrem timeouts
 */

import http from 'k6/http';
import { check, sleep } from 'k6';

// Configuração do teste com escalada agressiva
export const options = {
    stages: [
        { duration: '2m', target: 200 },   // 0 a 200 usuários em 2 minutos
        { duration: '2m', target: 500 },   // 200 a 500 usuários em 2 minutos
        { duration: '2m', target: 1000 },  // 500 a 1000 usuários em 2 minutos
        { duration: '1m', target: 0 },     // Ramp-down: voltar a 0
    ],
    
    thresholds: {
        // Sem thresholds rígidos - queremos ver a aplicação falhar
        http_req_duration: ['p(95)<5000'],   // Alerta se p95 > 5s
        http_req_duration: ['p(99)<10000'],  // Alerta se p99 > 10s
    },
};

const BASE_URL = 'http://localhost:3000';

export default function () {
    // Payload para o checkout com criptografia
    const payload = JSON.stringify({
        userId: Math.floor(Math.random() * 10000),
        creditCard: {
            number: '4111111111111111',
            cvv: '123',
            expiryDate: '12/25'
        },
        items: [
            { id: 1, name: 'Produto Premium', price: 299.90 }
        ],
        total: 299.90
    });

    const params = {
        headers: {
            'Content-Type': 'application/json',
        },
        timeout: '60s', // Timeout de 60s para permitir que vejamos a degradação
    };

    // Requisição POST para /checkout/crypto
    const response = http.post(`${BASE_URL}/checkout/crypto`, payload, params);
    
    // Verificações
    const checkResult = check(response, {
        'status é 201': (r) => r.status === 201,
        'resposta contém hash': (r) => {
            try {
                const body = JSON.parse(r.body);
                return body.hash !== undefined;
            } catch (e) {
                return false;
            }
        },
        'não houve timeout': (r) => r.status !== 0,
    });
    
    // Log quando começar a falhar
    if (!checkResult) {
        console.log(`❌ Falha detectada em __VU ${__VU} - Status: ${response.status}, Duração: ${response.timings.duration}ms`);
    }
    
    sleep(0.5); // Pausa menor para aumentar a pressão
}
