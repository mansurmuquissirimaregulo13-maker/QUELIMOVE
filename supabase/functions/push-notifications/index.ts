import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const fcmServiceAccount = JSON.parse(Deno.env.get("FCM_SERVICE_ACCOUNT") || "{}");

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Gets a valid Google OAuth2 access token for FCM
 */
async function getAccessToken(serviceAccount: any) {
    // Nota: Numa implementação real no Edge, seria necessário usar uma biblioteca de JWT
    // para assinar a requisição ao Google OAuth. Como o Deno Deploy tem limites,
    // assume-se que o utilizador configurará o SERVICE ACCOUNT corretamente.
    // Para simplificar esta demonstração técnica, o payload é enviado via API.
    return "ACCESS_TOKEN_PLACEHOLDER";
}

Deno.serve(async (req) => {
    try {
        const { record, table, type } = await req.json();

        let userId = "";
        let title = "";
        let body = "";

        // Lógica baseada na tabela que disparou o Webhook
        if (table === "rides") {
            userId = record.user_id;
            if (record.status === "accepted") {
                title = "Corrida Aceite! 🏍️";
                body = "Um motorista aceitou o seu pedido e está a caminho.";
            } else if (record.status === "completed") {
                title = "Viagem Finalizada ✅";
                body = "Obrigado por viajar com o Quelimove! Avalie o seu motorista.";
            } else if (record.status === "cancelled") {
                title = "Viagem Cancelada ❌";
                body = "O seu pedido de viagem foi cancelado.";
            }
        } else if (table === "messages") {
            userId = record.receiver_id;
            title = "Nova Mensagem 💬";
            body = record.content;
        }

        if (!userId) return new Response("No target user found", { status: 200 });

        // Pesquisar o token FCM do utilizador
        const { data: profile, error: profileError } = await supabase
            .from("profiles")
            .select("fcm_token, notifications_enabled")
            .eq("id", userId)
            .single();

        if (profileError || !profile?.fcm_token || !profile?.notifications_enabled) {
            return new Response("User not available for push", { status: 200 });
        }

        // Enviar para o Firebase
        // Nota: O FCM v1 requer OAuth2. Em produção, você deve substituir o URL abaixo.
        const fcmUrl = `https://fcm.googleapis.com/v1/projects/${fcmServiceAccount.project_id}/messages:send`;

        // Payload conforme documentação FCM v1
        const message = {
            message: {
                token: profile.fcm_token,
                notification: {
                    title,
                    body
                },
                android: {
                    notification: {
                        icon: "notification_icon",
                        color: "#FBBF24"
                    }
                },
                apns: {
                    payload: {
                        aps: {
                            badge: 1,
                            sound: "default"
                        }
                    }
                }
            }
        };

        // Aqui seria feita a chamada fetch real
        // const response = await fetch(fcmUrl, {
        //   method: "POST",
        //   headers: {
        //     "Authorization": `Bearer ${await getAccessToken(fcmServiceAccount)}`,
        //     "Content-Type": "application/json"
        //   },
        //   body: JSON.stringify(message)
        // });

        return new Response(JSON.stringify({ success: true, message: "Push trigger simulated" }), {
            headers: { "Content-Type": "application/json" }
        });

    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
});
