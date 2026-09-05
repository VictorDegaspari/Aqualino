<?php

namespace App\Modules\Identity\Notifications;

use App\Models\User;
use App\Modules\Identity\Application\AccountEmailContent;
use Illuminate\Auth\Notifications\VerifyEmail;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldBeEncrypted;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Support\Facades\URL;

class VerifyAccountEmail extends VerifyEmail implements ShouldBeEncrypted, ShouldQueue
{
    use Queueable;

    public int $tries = 3;

    public array $backoff = [10, 30, 60];

    public string $url;

    public function __construct(User $user)
    {
        $this->afterCommit();
        $this->url = rtrim(config('app.url'), '/').URL::temporarySignedRoute(
            'verification.verify', now()->addMinutes(60),
            ['id' => $user->id, 'hash' => sha1($user->getEmailForVerification()), 'locale' => $user->preferredLocale()], absolute: false,
        );
    }

    public function toMail($notifiable): MailMessage
    {
        $copy = AccountEmailContent::for($notifiable->preferredLocale(), 'verify');

        return (new MailMessage)->subject($copy['title'].' · Aqualino')
            ->view(['html' => 'mail.account-action', 'text' => 'mail.account-action-text'], [
                'copy' => $copy, 'name' => $notifiable->profile?->display_name ?? 'Aqualino', 'url' => $this->url,
            ]);
    }

    public function shouldSend(object $notifiable, string $channel): bool
    {
        return ! $notifiable->trashed() && ! $notifiable->hasVerifiedEmail();
    }
}
