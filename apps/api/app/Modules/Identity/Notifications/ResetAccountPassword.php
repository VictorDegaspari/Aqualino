<?php

namespace App\Modules\Identity\Notifications;

use App\Models\User;
use App\Modules\Identity\Application\AccountEmailContent;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldBeEncrypted;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;

class ResetAccountPassword extends ResetPassword implements ShouldBeEncrypted, ShouldQueue
{
    use Queueable;

    public int $tries = 3;

    public array $backoff = [10, 30, 60];

    public string $url;

    public function __construct(string $token, User $user)
    {
        parent::__construct($token);
        $this->afterCommit();
        $this->url = rtrim(config('app.url'), '/').route('password.reset', [
            'token' => $token, 'email' => $user->email, 'locale' => $user->preferredLocale(),
        ], false);
    }

    public function toMail($notifiable): MailMessage
    {
        $copy = AccountEmailContent::for($notifiable->preferredLocale(), 'reset');

        return (new MailMessage)->subject($copy['title'].' · Aqualino')
            ->view(['html' => 'mail.account-action', 'text' => 'mail.account-action-text'], [
                'copy' => $copy, 'name' => $notifiable->profile?->display_name ?? 'Aqualino', 'url' => $this->url,
            ]);
    }

    public function shouldSend(object $notifiable, string $channel): bool
    {
        return ! $notifiable->trashed();
    }
}
