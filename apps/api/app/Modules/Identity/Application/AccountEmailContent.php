<?php

namespace App\Modules\Identity\Application;

final class AccountEmailContent
{
    public static function for(string $locale, string $action): array
    {
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
}
