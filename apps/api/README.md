<p align="center"><a href="https://laravel.com" target="_blank"><img src="https://raw.githubusercontent.com/laravel/art/master/logo-lockup/5%20SVG/2%20CMYK/1%20Full%20Color/laravel-logolockup-cmyk-red.svg" width="400" alt="Laravel Logo"></a></p>

<p align="center">
<a href="https://github.com/laravel/framework/actions"><img src="https://github.com/laravel/framework/workflows/tests/badge.svg" alt="Build Status"></a>
<a href="https://packagist.org/packages/laravel/framework"><img src="https://img.shields.io/packagist/dt/laravel/framework" alt="Total Downloads"></a>
<a href="https://packagist.org/packages/laravel/framework"><img src="https://img.shields.io/packagist/v/laravel/framework" alt="Latest Stable Version"></a>
<a href="https://packagist.org/packages/laravel/framework"><img src="https://img.shields.io/packagist/l/laravel/framework" alt="License"></a>
</p>

## E-mails do Aqualino

O envio usa o driver nativo do Laravel com o SDK `resend/resend-php`, tanto para confirmação de e-mail quanto para recuperação de senha. As notificações são processadas pela fila; mantenha o Horizon em execução.

Para ativar o Resend, configure o `.env` da raiz ao usar Docker Compose, ou `apps/api/.env` ao executar a API diretamente:

```dotenv
MAIL_MAILER=resend
RESEND_API_KEY=re_sua_chave
MAIL_FROM_ADDRESS=contato@seu-dominio.com
MAIL_FROM_NAME=Aqualino
APP_URL=https://api.seu-dominio.com
```

Use um remetente de um [domínio verificado no Resend](https://resend.com/docs/send-with-laravel/). `APP_URL` deve ser acessível para os links de confirmação e recuperação de senha.

Depois de configurar, execute na raiz `docker compose up -d --build api horizon scheduler` para instalar o SDK e aplicar a configuração à API e aos workers. Fora do Docker, execute `composer install`, limpe o cache de configuração com `php artisan config:clear` e reinicie os workers.

### Confirmação de e-mail no ambiente local

```dotenv
APP_ENV=local
LOCAL_SKIP_EMAIL_VERIFICATION=true
```

Essa opção libera cadastro, login e rotas protegidas sem exigir confirmação, e suprime o envio de e-mails de confirmação. O e-mail continua sem confirmação no banco; desativar a opção restaura a exigência. A opção é ignorada fora de `APP_ENV=local` e não altera a recuperação de senha.

Para testar o fluxo completo localmente, use `LOCAL_SKIP_EMAIL_VERIFICATION=false`. O envio local padrão continua pelo Mailpit (`MAIL_MAILER=smtp`, `MAIL_HOST=mailpit`, `MAIL_PORT=1025`), sem precisar de uma chave do Resend. Recrie os serviços do Compose ou limpe o cache e reinicie os workers após alterar as variáveis.

## About Laravel

Laravel is a web application framework with expressive, elegant syntax. We believe development must be an enjoyable and creative experience to be truly fulfilling. Laravel takes the pain out of development by easing common tasks used in many web projects, such as:

- [Simple, fast routing engine](https://laravel.com/docs/routing).
- [Powerful dependency injection container](https://laravel.com/docs/container).
- Multiple back-ends for [session](https://laravel.com/docs/session) and [cache](https://laravel.com/docs/cache) storage.
- Expressive, intuitive [database ORM](https://laravel.com/docs/eloquent).
- Database agnostic [schema migrations](https://laravel.com/docs/migrations).
- [Robust background job processing](https://laravel.com/docs/queues).
- [Real-time event broadcasting](https://laravel.com/docs/broadcasting).

Laravel is accessible, powerful, and provides tools required for large, robust applications.

## Learning Laravel

Laravel has the most extensive and thorough [documentation](https://laravel.com/docs) and video tutorial library of all modern web application frameworks, making it a breeze to get started with the framework.

In addition, [Laracasts](https://laracasts.com) contains thousands of video tutorials on a range of topics including Laravel, modern PHP, unit testing, and JavaScript. Boost your skills by digging into our comprehensive video library.

You can also watch bite-sized lessons with real-world projects on [Laravel Learn](https://laravel.com/learn), where you will be guided through building a Laravel application from scratch while learning PHP fundamentals.

## Agentic Development

Laravel's predictable structure and conventions make it ideal for AI coding agents like Claude Code, Cursor, and GitHub Copilot. Install [Laravel Boost](https://laravel.com/docs/ai) to supercharge your AI workflow:

```bash
composer require laravel/boost --dev

php artisan boost:install
```

Boost provides your agent 15+ tools and skills that help agents build Laravel applications while following best practices.

## Contributing

Thank you for considering contributing to the Laravel framework! The contribution guide can be found in the [Laravel documentation](https://laravel.com/docs/contributions).

## Code of Conduct

In order to ensure that the Laravel community is welcoming to all, please review and abide by the [Code of Conduct](https://laravel.com/docs/contributions#code-of-conduct).

## Security Vulnerabilities

If you discover a security vulnerability within Laravel, please send an e-mail to Taylor Otwell via [taylor@laravel.com](mailto:taylor@laravel.com). All security vulnerabilities will be promptly addressed.

## License

The Laravel framework is open-sourced software licensed under the [MIT license](https://opensource.org/licenses/MIT).
