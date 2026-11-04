/* =========================================
   TOKENLINK - JAVASCRIPT PRINCIPAL
   (carregado em todas as páginas)
   ========================================= */

/* ---------- CONFIGURAÇÃO (preencha antes de publicar) ---------- */

// Número do WhatsApp da empresa: código do país + DDD + número, apenas dígitos.
// ATENÇÃO: o valor abaixo é um exemplo. Troque pelo número real.
const NUMERO_WHATSAPP = '5511999999999';

// Endereço que recebe o formulário de contato (ex.: Formspree, Getform ou um backend próprio).
// Formspree: crie um formulário em formspree.io e cole aqui 'https://formspree.io/f/SEU_CODIGO'.
// Enquanto estiver vazio, o formulário avisa o visitante que o envio não está disponível
// (em vez de fingir que enviou) e sugere o WhatsApp.
const FORM_ENDPOINT = '';

/* --------------------------------------------------------------- */

document.addEventListener('DOMContentLoaded', () => {

    const prefereMenosMovimento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const params = new URLSearchParams(window.location.search);


    // 1. MENU MOBILE
    const menuToggle = document.getElementById('menu-toggle');
    const mobileMenu = document.getElementById('mobile-menu');

    if (menuToggle && mobileMenu) {
        const iconeMenu = menuToggle.querySelector('i');

        const alternarMenu = (abrir) => {
            mobileMenu.classList.toggle('hidden', !abrir);
            menuToggle.setAttribute('aria-expanded', String(abrir));
            menuToggle.setAttribute('aria-label', abrir ? 'Fechar menu' : 'Abrir menu');
            if (iconeMenu) {
                iconeMenu.classList.toggle('fa-bars', !abrir);
                iconeMenu.classList.toggle('fa-xmark', abrir);
            }
        };

        menuToggle.addEventListener('click', () => {
            alternarMenu(mobileMenu.classList.contains('hidden'));
        });

        // Fecha o menu ao clicar em um link
        mobileMenu.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => alternarMenu(false));
        });

        // Fecha com Esc e devolve o foco ao botão
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !mobileMenu.classList.contains('hidden')) {
                alternarMenu(false);
                menuToggle.focus();
            }
        });

        // Se a janela passar para a largura de desktop, o menu mobile é fechado
        window.matchMedia('(min-width: 768px)').addEventListener('change', (e) => {
            if (e.matches) alternarMenu(false);
        });
    }


    // 2. ANIMAÇÃO DE SCROLL (FADE IN) DOS CARDS
    const cards = document.querySelectorAll('section .grid > .card');

    if (cards.length && 'IntersectionObserver' in window && !prefereMenosMovimento) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (!entry.isIntersecting) return;

                const card = entry.target;
                card.classList.add('is-visible');

                // Ao terminar a animação DO CARD, remove as classes para o hover voltar a funcionar.
                // animationend também borbulha de elementos internos, por isso o filtro por e.target.
                const aoTerminar = (e) => {
                    if (e.target !== card) return;
                    card.removeEventListener('animationend', aoTerminar);
                    card.classList.remove('reveal', 'is-visible');
                    card.style.removeProperty('--reveal-delay');
                };
                card.addEventListener('animationend', aoTerminar);

                observer.unobserve(card);
            });
        }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

        cards.forEach(card => {
            // Delay progressivo por posição dentro da grade (máx. 0,3 s)
            const posicao = Array.from(card.parentElement.children).indexOf(card);
            card.style.setProperty('--reveal-delay', `${Math.min(posicao, 3) * 0.1}s`);
            card.classList.add('reveal');
            observer.observe(card);
        });
    }


    // 3. GALERIA DE IMAGENS DO PRODUTO
    // Cada miniatura (.thumb) pode apontar para a imagem grande via data-full.
    document.querySelectorAll('[data-gallery]').forEach(galeria => {
        const principal = galeria.querySelector('[data-gallery-main]');
        const palco = galeria.querySelector('[data-gallery-stage]');
        const legenda = galeria.querySelector('[data-gallery-caption]');
        const miniaturas = galeria.querySelectorAll('.thumb');

        if (!principal || !palco) return;

        miniaturas.forEach(btn => {
            btn.addEventListener('click', () => {
                const img = btn.querySelector('img');
                if (!img) return;

                principal.src = btn.dataset.full || img.src;
                principal.alt = img.alt;
                palco.style.background = btn.dataset.bg || '#fff';
                if (legenda) legenda.textContent = btn.dataset.label || '';

                miniaturas.forEach(b => b.removeAttribute('aria-current'));
                btn.setAttribute('aria-current', 'true');
            });
        });
    });


    // 4. FORMULÁRIO DE CONTATO (existe apenas no index.html)
    const form = document.getElementById('form-contato');
    const status = document.getElementById('form-status');

    const mostrarStatus = (texto, ok = true) => {
        if (!status) return;
        status.textContent = texto;
        status.className = 'form-status text-center text-sm font-medium ' +
            (ok ? 'text-cyan-300' : 'text-red-300');
    };

    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const nome = form.elements['nome'].value.trim();
            const btnSubmit = form.querySelector('button[type="submit"]');
            const textoOriginal = btnSubmit.innerHTML;

            btnSubmit.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Enviando...';
            btnSubmit.disabled = true;
            mostrarStatus('');

            try {
                if (!FORM_ENDPOINT) {
                    console.warn('Tokenlink: FORM_ENDPOINT não configurado em script.js; nenhum dado foi enviado.');
                    throw new Error('endpoint-nao-configurado');
                }

                const resposta = await fetch(FORM_ENDPOINT, {
                    method: 'POST',
                    body: new FormData(form),
                    headers: { Accept: 'application/json' }
                });
                if (!resposta.ok) throw new Error('http-' + resposta.status);

                mostrarStatus(`Obrigado, ${nome || 'Cliente'}! Sua solicitação foi recebida. A equipe Tokenlink entrará em contato em breve.`);
                form.reset();
            } catch (erro) {
                mostrarStatus('Não foi possível enviar a mensagem agora. Fale com a gente pelo WhatsApp ou tente novamente em instantes.', false);
            } finally {
                btnSubmit.innerHTML = textoOriginal;
                btnSubmit.disabled = false;
            }
        });
    }


    // 5. WHATSAPP INTELIGENTE (puxa os dados do formulário)
    const btnWhatsapp = document.getElementById('btn-whatsapp');

    if (btnWhatsapp && form) {
        btnWhatsapp.addEventListener('click', (e) => {
            e.preventDefault();

            const nome = form.elements['nome'].value.trim() || 'Cliente';
            const interesse = form.elements['interesse'].value || 'seus produtos';
            const detalhes = form.elements['mensagem'].value.trim();

            let mensagem = `Olá, Tokenlink! Meu nome é ${nome} e tenho interesse em ${interesse}. Gostaria de solicitar um orçamento.`;
            if (detalhes) mensagem += `\n\nDetalhes: ${detalhes}`;

            const url = `https://wa.me/${NUMERO_WHATSAPP}?text=${encodeURIComponent(mensagem)}`;
            window.open(url, '_blank', 'noopener');
        });
    }


    // 6. LINKS DE WHATSAPP DIRETOS (<a data-whatsapp="mensagem">)
    document.querySelectorAll('a[data-whatsapp]').forEach(link => {
        link.href = `https://wa.me/${NUMERO_WHATSAPP}?text=${encodeURIComponent(link.dataset.whatsapp)}`;
    });


    // 7. PRÉ-PREENCHIMENTO VIA URL (ex.: index.html?interesse=Câmeras PTZ&produto=...#contato)
    const campoMensagem = document.getElementById('mensagem');
    const produtoUrl = params.get('produto');
    if (campoMensagem && produtoUrl && !campoMensagem.value) {
        campoMensagem.value = `Tenho interesse no produto: ${produtoUrl}.\nQuantidade e tipo de instalação: `;
    }

    const selectInteresse = document.getElementById('interesse');
    const interesseUrl = params.get('interesse');
    if (selectInteresse && interesseUrl) {
        const existe = Array.from(selectInteresse.options).some(o => o.value === interesseUrl);
        if (existe) selectInteresse.value = interesseUrl;
    }

});
