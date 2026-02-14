import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const fcmServiceAccount = JSON.parse(Deno.env.get("FCM_SERVICE_ACCOUNT") || "{}");

const supabase = createClient(supabaseUrl, supabaseServiceKey);

Deno.serve(async (req) => {
    try {
        const body = await req.json();
        const { userId, title, body: messageBody, data } = body;

        if (!userId) {
            return new Response(JSON.stringify({ error: "No userId provided" }), { status: 400 });
        }

        // Fetch user's FCM token
        const { data: profile, error: profileError } = await supabase
            .from("profiles")
            .select("fcm_token, notifications_enabled")
            .eq("id", userId)
            .single();

        if (profileError || !profile?.fcm_token) {
            return new Response(JSON.stringify({ message: "User has no FCM token or doesn't exist" }), { status: 200 });
        }

        if (!profile.notifications_enabled) {
            return new Response(JSON.stringify({ message: "User disabled notifications" }), { status: 200 });
        }

        // FCM v1 Send URL
        const fcmUrl = `https://fcm.googleapis.com/v1/projects/${fcmServiceAccount.project_id}/messages:send`;
        const accessToken = Deno.env.get("FCM_ACCESS_TOKEN");

        if (!accessToken) {
            console.error("FCM_ACCESS_TOKEN not set.");
            return new Response(JSON.stringify({ error: "Notification service not optimized" }), { status: 200 });
        }

        const message = {
            message: {
                token: profile.fcm_token,
                notification: {
                    title: title || "Quelimove Notification",
                    body: messageBody || ""
                },
                data: data || {},
                android: {
                    priority: "high",
                    notification: {
                        channel_id: "rides",
                        sound: "default"
                    }
                },
                apns: {
                    payload: {
                        aps: {
                            alert: {
                                title: title,
                                body: messageBody
                            },
                            sound: "default"
                        }
                    }
                }
            }
        };

        const response = await fetch(fcmUrl, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${accessToken}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(message)
        });

        const result = await response.json();
        return new Response(JSON.stringify({ success: true, result }), {
            headers: { "Content-Type": "application/json" }
        });

    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
});
