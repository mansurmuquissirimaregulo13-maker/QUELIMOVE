export function sanitizeAuthError(error: any, phone?: string): string {
    if (!error) return 'Ocorreu um erro desconhecido.';

    // Converte para string e coloca em minusculas para busca
    const originalMessage = typeof error === 'string' ? error : (error.message || JSON.stringify(error));
    const msg = originalMessage.toLowerCase();

    // 1. Erros de conta já existente
    if (msg.includes('already registered') || msg.includes('already in use') || msg.includes('already exists')) {
        return 'Este número já tem uma conta activada. Por favor, introduza a sua palavra-passe para entrar.';
    }

    // 2. Erros de credenciais inválidas
    if (msg.includes('invalid login credentials') || msg.includes('invalid credentials')) {
        return 'Telefone ou palavra-passe incorretos.';
    }

    // 3. Erros de Rate Limit (DDoS protection)
    if (msg.includes('rate limit')) {
        return 'Ops! Tivemos muitas tentativas seguidas. Por favor, aguarda alguns minutos antes de tentares novamente. (Dica: reiniciar os dados móveis pode ajudar)';
    }

    // 4. Erros de confirmação de email (que não deve aparecer ao user)
    if (msg.includes('confirmation')) {
        return 'Houve um pequeno problema técnico na criação da conta. Por favor, contacta o suporte para activação manual.';
    }

    // 5. LIMPEZA CRÍTICA: Remover qualquer menção a domínios internos ou emails
    // Se a mensagem contiver @quelimove.mz ou @app.quelimove.com...
    if (msg.includes('@quelimove.mz') || msg.includes('.quelimove.com') || msg.includes('email')) {
        // Se tivermos o telefone, tentamos reconstruir uma mensagem amigável
        if (phone) {
            return `Problema com a conta associada ao número ${phone}. Verifica os teus dados.`;
        }
        return 'Ocorreu um erro de autenticação. Por favor, verifica o teu número e tenta novamente.';
    }

    // Se for um erro genérico do Supabase mas não for vazamento de dados
    if (originalMessage === 'User already registered') return 'Este número já está registado.';

    return originalMessage;
}
