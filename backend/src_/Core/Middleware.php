<?php

namespace App\Core;

abstract class Middleware
{
    protected ?Middleware $next = null;

    public function setNext(Middleware $next): Middleware
    {
        $this->next = $next;
        return $next;
    }

    abstract public function handle(Request $request): ?Response;

    protected function next(Request $request): ?Response
    {
        if ($this->next) {
            return $this->next->handle($request);
        }
        return null;
    }
}
