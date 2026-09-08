<?php

namespace App\Modules\Identity\Application;

final class AccountEmailContent
{
    public static function for(string $locale, string $action): array
    {
        if ($locale === 'es-ES') {
            return self::spanish($action);
        }
        $english = $locale === 'en-US';
        $base = [
            'locale' => $english ? 'en-US' : 'pt-BR',
            'brand' => 'Aqualino',
            'eyebrow' => $english ? 'YOUR JOURNEY, PROTECTED' : 'SUA JORNADA, PROTEGIDA',
            'greeting' => $english ? 'Hello' : 'Olá',
            'footer' => $english ? 'Small steps. Great waves.' : 'Pequenos passos. Grandes marés.',
            'ignore' => $english ? 'If you did not request this, you can ignore this email.' : 'Se você não fez esta solicitação, pode ignorar este e-mail.',
            'fallback' => $english ? 'If the button does not work, copy this link into your browser:' : 'Se o botão não funcionar, copie este link no navegador:',
            'open_app' => $english ? 'Open Aqualino' : 'Abrir Aqualino',
            'email_label' => 'E-mail',
            'password_label' => $english ? 'New password' : 'Nova senha',
            'confirmation_label' => $english ? 'Confirm new password' : 'Confirme a nova senha',
            'password_hint' => $english ? 'Use at least 8 characters, with letters and numbers.' : 'Use pelo menos 8 caracteres, com letras e números.',
            'password_mismatch' => $english ? 'The passwords must match.' : 'As senhas precisam ser iguais.',
            'submit' => $english ? 'Save new password' : 'Salvar nova senha',
            'working' => $english ? 'Please wait…' : 'Aguarde…',
            'error' => $english ? 'We could not complete this action. Please try again.' : 'Não foi possível concluir. Tente novamente.',
            'invalid_reset' => $english ? 'This link is invalid or expired. Request another one in the app.' : 'Este link é inválido ou expirou. Solicite outro pelo aplicativo.',
            'reset_success' => $english ? 'Password updated! Sign in again with your new password.' : 'Senha atualizada! Entre novamente com sua nova senha.',
            'reset_success_title' => $english ? 'A fresh start' : 'Tudo pronto para voltar',
        ];
        $content = match ($action) {
            'verify' => [
                'title' => $english ? 'Confirm your email' : 'Confirme seu e-mail',
                'body' => $english ? 'Your Aqualino is ready for this journey. Confirm your email to finish creating your account.' : 'Seu Aqualino está pronto para essa jornada. Confirme seu e-mail para concluir a criação da conta.',
                'button' => $english ? 'Confirm email' : 'Confirmar e-mail',
                'expiry' => $english ? 'This confirmation link expires in 60 minutes.' : 'Este link de confirmação expira em 60 minutos.',
            ],
            'verified' => [
                'title' => $english ? 'Email confirmed!' : 'E-mail confirmado!',
                'body' => $english ? 'Everything is ready. Return to Aqualino and continue your hydration journey.' : 'Tudo pronto. Volte ao Aqualino e continue sua jornada de hidratação.',
            ],
            'invalid' => [
                'title' => $english ? 'Let’s try another link' : 'Vamos tentar outro link',
                'body' => $english ? 'This confirmation link is invalid or expired. Open Aqualino and request another email.' : 'Este link de confirmação é inválido ou expirou. Abra o Aqualino e solicite um novo e-mail.',
            ],
            default => [
                'title' => $english ? 'Reset your password' : 'Redefina sua senha',
                'body' => $english ? 'It happens. Choose a new password and get back to caring for your Aqualino.' : 'Acontece. Escolha uma nova senha e volte a cuidar do seu Aqualino.',
                'button' => $english ? 'Reset password' : 'Redefinir senha',
                'expiry' => $english ? 'This password reset link expires in 60 minutes and can be used once.' : 'Este link expira em 60 minutos e só pode ser usado uma vez.',
            ],
        };

        return [...$base, ...$content];
    }

    private static function spanish(string $action): array
    {
        $base = [
            'locale' => 'es-ES', 'brand' => 'Aqualino', 'eyebrow' => 'TU CAMINO, PROTEGIDO',
            'greeting' => 'Hola', 'footer' => 'Pequeños pasos. Grandes mareas.',
            'ignore' => 'Si no lo has solicitado, puedes ignorar este correo.',
            'fallback' => 'Si el botón no funciona, copia este enlace en tu navegador:',
            'open_app' => 'Abrir Aqualino', 'email_label' => 'Correo electrónico',
            'password_label' => 'Contraseña nueva', 'confirmation_label' => 'Confirmar contraseña nueva',
            'password_hint' => 'Usa al menos 8 caracteres, con letras y números.',
            'password_mismatch' => 'Las contraseñas deben coincidir.', 'submit' => 'Guardar contraseña nueva',
            'working' => 'Espera…', 'error' => 'No se pudo completar la acción. Inténtalo de nuevo.',
            'invalid_reset' => 'Este enlace no es válido o ha caducado. Solicita otro en la app.',
            'reset_success' => '¡Contraseña actualizada! Inicia sesión con tu contraseña nueva.',
            'reset_success_title' => 'Todo listo para volver',
        ];
        $content = match ($action) {
            'verify' => [
                'title' => 'Confirma tu correo',
                'body' => 'Tu Aqualino está listo para este camino. Confirma tu correo para terminar de crear tu cuenta.',
                'button' => 'Confirmar correo', 'expiry' => 'Este enlace de confirmación caduca en 60 minutos.',
            ],
            'verified' => [
                'title' => '¡Correo confirmado!',
                'body' => 'Todo listo. Vuelve a Aqualino y continúa tu camino de hidratación.',
            ],
            'invalid' => [
                'title' => 'Vamos a probar otro enlace',
                'body' => 'Este enlace de confirmación no es válido o ha caducado. Abre Aqualino y solicita otro correo.',
            ],
            default => [
                'title' => 'Restablece tu contraseña',
                'body' => 'Puede pasar. Elige una contraseña nueva y vuelve a cuidar de tu Aqualino.',
                'button' => 'Restablecer contraseña',
                'expiry' => 'Este enlace caduca en 60 minutos y solo se puede usar una vez.',
            ],
        };

        return [...$base, ...$content];
    }
}
