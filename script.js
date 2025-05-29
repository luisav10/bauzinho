// script.js (Para a página do Aluno - index.html)

document.addEventListener('DOMContentLoaded', () => {
    const cardapioItensDiv = document.getElementById('cardapio-itens-aluno');
    const confirmarEscolhaBtn = document.getElementById('confirmar-escolha-aluno');
    const currentDateSpan = document.getElementById('current-date');
    const currentTimeSpan = document.getElementById('current-time');
    const turnosButtons = document.querySelectorAll('.btn-turno');

    let selectedTurno = 'Manhã'; // Default ou pode ser detectado pelo horário

    // --- Funções de Data e Hora ---
    function updateDateTime() {
        const now = new Date();
        const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        const timeOptions = { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false };
        currentDateSpan.textContent = now.toLocaleDateString('pt-BR', dateOptions);
        currentTimeSpan.textContent = now.toLocaleTimeString('pt-BR', timeOptions);
    }
    setInterval(updateDateTime, 1000); // Atualiza a cada segundo
    updateDateTime(); // Chama uma vez para exibir imediatamente

    // --- Seleção de Turno ---
    turnosButtons.forEach(button => {
        button.addEventListener('click', () => {
            turnosButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            selectedTurno = button.dataset.turno;
            // console.log(`Turno selecionado: ${selectedTurno}`);
            // No futuro, podemos usar este `selectedTurno` para filtrar o cardápio ou o relatório
        });
    });

    // --- Funções de Local Storage para Merenda ---
    function loadMerendaData() {
        let contagemMerenda = {};
        let numConfirmacoes = 0;
        try {
            const savedContagem = localStorage.getItem('bauMerendaContagem');
            if (savedContagem) {
                contagemMerenda = JSON.parse(savedContagem);
            }
            const savedNumConfirmacoes = localStorage.getItem('bauMerendaNumConfirmacoes');
            if (savedNumConfirmacoes) {
                numConfirmacoes = parseInt(savedNumConfirmacoes);
            }
        } catch (e) {
            console.error('Erro ao carregar dados do localStorage para merenda:', e);
        }
        return { contagemMerenda, numConfirmacoes };
    }

    function saveMerendaData(contagemMerenda, numConfirmacoes) {
        try {
            localStorage.setItem('bauMerendaContagem', JSON.stringify(contagemMerenda));
            localStorage.setItem('bauMerendaNumConfirmacoes', numConfirmacoes.toString());
            console.log('Dados de merenda salvos no localStorage.');
        } catch (e) {
            console.error('Erro ao salvar dados de merenda no localStorage:', e);
        }
    }

    function getCardapioFromLocalStorage() {
        try {
            const savedCardapio = localStorage.getItem('cardapioDoDia');
            return savedCardapio ? JSON.parse(savedCardapio) : [];
        } catch (e) {
            console.error('Erro ao carregar cardápio do localStorage:', e);
            return [];
        }
    }

    // --- Funções da Interface do Usuário ---
    function carregarCardapioAluno() {
        const cardapioDoDia = getCardapioFromLocalStorage();
        cardapioItensDiv.innerHTML = ''; // Limpa o conteúdo antes de recarregar

        if (cardapioDoDia.length === 0) {
            cardapioItensDiv.innerHTML = '<p class="info-message">Nenhum item de merenda disponível para hoje. Por favor, aguarde as merendeiras atualizarem o cardápio!</p>';
            confirmarEscolhaBtn.disabled = true; // Desabilita o botão se não houver itens
            confirmarEscolhaBtn.classList.add('disabled'); // Adiciona classe para estilo de desabilitado
            return;
        } else {
            confirmarEscolhaBtn.disabled = false;
            confirmarEscolhaBtn.classList.remove('disabled');
        }

        cardapioDoDia.forEach(item => {
            const card = document.createElement('div');
            card.classList.add('item-merenda-chic');
            card.dataset.id = item.id;
            // Usar um placeholder de ícone caso o usuário não tenha um.
            // O ideal seria ter uma pasta 'icons/' com imagens padrão (ex: default_dish.png).
            const iconPath = item.icone && item.icone.trim() !== '' ? item.icone : 'default_dish.png'; // Caminho do ícone

            card.innerHTML = `
                <img src="${iconPath}" alt="${item.nome}" onerror="this.onerror=null; this.src='default_dish.png';">
                <p>${item.nome}</p>
            `;

            if (item.tipo === 'unidade') {
                // Para itens por unidade, adicione os controles de quantidade
                const quantityControl = document.createElement('div');
                quantityControl.classList.add('quantity-control');
                quantityControl.innerHTML = `
                    <button class="quantity-btn decrease-btn" data-item-id="${item.id}">-</button>
                    <span class="item-quantity" id="quantity-${item.id}">0</span>
                    <button class="quantity-btn increase-btn" data-item-id="${item.id}">+</button>
                `;
                card.appendChild(quantityControl);

                // Event Listeners para botões de quantidade
                quantityControl.querySelector('.increase-btn').addEventListener('click', (event) => {
                    event.stopPropagation(); // Evita que o clique no botão selecione o card
                    const itemId = event.target.dataset.itemId;
                    const quantitySpan = document.getElementById(`quantity-${itemId}`);
                    let currentQuantity = parseInt(quantitySpan.textContent);
                    currentQuantity++;
                    quantitySpan.textContent = currentQuantity;
                    card.classList.add('selected'); // Marca o card como selecionado se a quantidade > 0
                });

                quantityControl.querySelector('.decrease-btn').addEventListener('click', (event) => {
                    event.stopPropagation(); // Evita que o clique no botão deselecione o card
                    const itemId = event.target.dataset.itemId;
                    const quantitySpan = document.getElementById(`quantity-${itemId}`);
                    let currentQuantity = parseInt(quantitySpan.textContent);
                    if (currentQuantity > 0) {
                        currentQuantity--;
                        quantitySpan.textContent = currentQuantity;
                        if (currentQuantity === 0) {
                            card.classList.remove('selected'); // Remove a seleção se a quantidade for 0
                        }
                    }
                });
            } else {
                // Para itens por porção, apenas a seleção
                card.addEventListener('click', () => toggleSelecaoMerenda(card, item.id));
            }
            cardapioItensDiv.appendChild(card);
        });
    }

    function toggleSelecaoMerenda(card, itemId) {
        // Para itens "por porção", apenas alternar a classe 'selected'
        card.classList.toggle('selected');
    }

    // --- Eventos ---
    confirmarEscolhaBtn.addEventListener('click', () => {
        let { contagemMerenda, numConfirmacoes } = loadMerendaData();
        const cardapioDoDia = getCardapioFromLocalStorage();
        let totalItensEscolhidos = 0; // Para verificar se algo foi selecionado

        cardapioDoDia.forEach(item => {
            if (item.tipo === 'unidade') {
                const quantitySpan = document.getElementById(`quantity-${item.id}`);
                if (quantitySpan) { // Verifica se o span existe (se o item é de unidade)
                    const quantity = parseInt(quantitySpan.textContent);
                    if (quantity > 0) {
                        if (contagemMerenda[item.id]) {
                            contagemMerenda[item.id] += quantity;
                        } else {
                            contagemMerenda[item.id] = quantity;
                        }
                        totalItensEscolhidos += quantity; // Adiciona à contagem total
                    }
                }
            } else { // Tipo 'porcao'
                const card = document.querySelector(`.item-merenda-chic[data-id="${item.id}"]`);
                if (card && card.classList.contains('selected')) {
                    if (contagemMerenda[item.id]) {
                        contagemMerenda[item.id]++;
                    } else {
                        contagemMerenda[item.id] = 1;
                    }
                    totalItensEscolhidos++; // Conta como uma porção
                }
            }
        });

        if (totalItensEscolhidos > 0) {
            numConfirmacoes++; // Incrementa a contagem de "pratos montados"
            saveMerendaData(contagemMerenda, numConfirmacoes);

            alert('Sua escolha foi registrada com sucesso! Bom apetite!');

            // Reinicia a seleção e as quantidades no front-end
            document.querySelectorAll('.item-merenda-chic').forEach(card => {
                card.classList.remove('selected');
            });
            document.querySelectorAll('.item-quantity').forEach(span => {
                span.textContent = '0';
            });
            carregarCardapioAluno(); // Recarrega para limpar as seleções visuais
        } else {
            alert('Por favor, selecione ao menos um item da merenda ou defina a quantidade.');
        }
    });

    // --- Inicialização ---
    carregarCardapioAluno();

    // Adiciona um listener para atualizar o cardápio caso a merendeira mude
    window.addEventListener('storage', (event) => {
        if (event.key === 'cardapioDoDia') {
            console.log('Cardápio atualizado pela merendeira, recarregando...');
            carregarCardapioAluno(); // Recarrega o cardápio se ele for atualizado
        }
    });
});