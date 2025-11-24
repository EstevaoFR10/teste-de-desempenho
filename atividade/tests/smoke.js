/**
 * SMOKE TEST
 * 
 * Objetivo: Verificar se a API está funcionando antes de executar testes pesados
 * Cenário: 1 usuário virtual por 30 segundos
 * Endpoint: GET /health
 * Critério de Sucesso: 100% de requisições bem-sucedidas
 */

import http from 'k6/http';
import { check, sleep } from 'k6';

// Configuração do teste
export const options = {
    vus: 1,              // 1 usuário virtual
    duration: '30s',     // Duração de 30 segundos
    
    thresholds: {
        http_req_failed: ['rate==0'],    // 0% de falhas (100% de sucesso)
        http_req_duration: ['p(95)<1000'], // 95% das requisições abaixo de 1s
    },
};

const BASE_URL = 'http://localhost:3000';

export default function () {
    // Requisição GET para /health
    const response = http.get(`${BASE_URL}/health`);
    
    // Verificações
    check(response, {
        'status é 200': (r) => r.status === 200,
        'resposta contém status UP': (r) => {
            try {
                const body = JSON.parse(r.body);
                return body.status === 'UP';
            } catch (e) {
                return false;
            }
        },
        'tempo de resposta < 1s': (r) => r.timings.duration < 1000,
    });
    
    sleep(1); // Pausa de 1 segundo entre requisições
}
