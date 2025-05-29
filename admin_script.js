// admin_script.js (Para a página da Merendeira - admin.html)

document.addEventListener('DOMContentLoaded', () => {
    const authSection = document.getElementById('auth-section');
    const adminPanelSection = document.getElementById('admin-panel-section');
    const relatorioSection = document.getElementById('relatorio-section');
    const cardapioGerenciamentoSection = document.getElementById('cardapio-gerenciamento-section');

    const loginForm = document.getElementById('login-form');
    const cadastroForm = document.getElementById('cadastro-form');
    const showCadastroBtn = document.getElementById('show-cadastro-btn');
    const hideCadastroBtn = document.getElementById('hide-cadastro-btn');
    const authMessage = document.getElementById('auth-message');
    const logoutBtn = document.getElementById('logout-btn');

    const relatorioContagemDiv = document.getElementById('relatorio-contagem-merendeira');
    const gerarRelatorioPdfBtn = document.getElementById('gerar-relatorio-pdf-merendeira');
    const resetDadosBtn = document.getElementById('reset-dados-btn');

    const addItemForm = document.getElementById('add-item-form');
    const itemNomeInput = document.getElementById('item-nome');
    // const itemIconeInput = document.getElementById('item-icone'); // Campo de ícone removido
    const itemTipoSelect = document.getElementById('item-tipo');
    const cardapioListAdmin = document.getElementById('cardapio-list-admin');

    let merendaChart; // Variável para armazenar a instância do Chart.js

    // --- Funções de Autenticação (usando localStorage para simulação) ---
    function registerUser(username, password) {
        if (localStorage.getItem('merendeira_' + username)) {
            authMessage.textContent = 'Usuário já existe!';
            authMessage.style.color = 'var(--error-red)';
            return false;
        }
        localStorage.setItem('merendeira_' + username, password);
        authMessage.textContent = 'Cadastro realizado com sucesso! Faça login.';
        authMessage.style.color = 'var(--accent-color)'; // Usando a cor verde de acento
        return true;
    }

    function loginUser(username, password) {
        if (localStorage.getItem('merendeira_' + username) === password) {
            sessionStorage.setItem('loggedInUser', username);
            authMessage.textContent = '';
            return true;
        }
        authMessage.textContent = 'Usuário ou senha inválidos.';
        authMessage.style.color = 'var(--error-red)';
        return false;
    }

    function checkLogin() {
        if (sessionStorage.getItem('loggedInUser')) {
            authSection.style.display = 'none';
            adminPanelSection.style.display = 'flex'; // Usar flex para os cards lado a lado
            carregarCardapioAdmin();
            atualizarRelatorioAdmin();
            return true;
        }
        authSection.style.display = 'block';
        adminPanelSection.style.display = 'none';
        return false;
    }

    function logout() {
        sessionStorage.removeItem('loggedInUser');
        authSection.style.display = 'block';
        adminPanelSection.style.display = 'none';
        authMessage.textContent = 'Você saiu.';
        authMessage.style.color = 'var(--text-dark)';
        loginForm.reset();
        // Destruir o gráfico ao sair
        if (merendaChart) {
            merendaChart.destroy();
        }
    }

    // --- Funções de Gerenciamento do Cardápio (para a Merendeira) ---
    function getCardapioFromLocalStorage() {
        try {
            const savedCardapio = localStorage.getItem('cardapioDoDia');
            return savedCardapio ? JSON.parse(savedCardapio) : [];
        } catch (e) {
            console.error('Erro ao carregar cardápio do localStorage:', e);
            return [];
        }
    }

    function saveCardapioToLocalStorage(cardapio) {
        try {
            localStorage.setItem('cardapioDoDia', JSON.stringify(cardapio));
            console.log('Cardápio salvo no localStorage.');
        } catch (e) {
            console.error('Erro ao salvar cardápio no localStorage:', e);
            alert('Não foi possível salvar o cardápio localmente. Verifique as configurações do navegador.');
        }
    }

    function carregarCardapioAdmin() {
        const cardapio = getCardapioFromLocalStorage();
        cardapioListAdmin.innerHTML = '';
        if (cardapio.length === 0) {
            cardapioListAdmin.innerHTML = '<p class="info-message">Nenhum item no cardápio. Adicione novos itens acima.</p>';
        } else {
            cardapio.forEach(item => {
                const itemDiv = document.createElement('div');
                itemDiv.classList.add('cardapio-item-admin');
                itemDiv.dataset.id = item.id;
                itemDiv.innerHTML = `
                    <span class="item-info">${item.nome} <span class="item-type">(${item.tipo === 'unidade' ? 'Unidade' : 'Porção'})</span></span>
                    <button class="delete-btn" data-id="${item.id}">Remover</button>
                `;
                cardapioListAdmin.appendChild(itemDiv);
            });
        }
    }

    addItemForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const nome = itemNomeInput.value.trim();
        // O ícone agora é assumido ou pode ser gerado com base no nome do alimento
        // Para uma versão mais robusta, você teria um mapeamento de nomes para caminhos de ícones
        const icone = `icon_${nome.toLowerCase().replace(/\s/g, '_')}.png`; // Exemplo: icon_arroz.png
        const tipo = itemTipoSelect.value;

        if (nome) { // Ícone não é mais obrigatório no input, mas será inferido/padrão
            let cardapio = getCardapioFromLocalStorage();
            // Gera um ID único simples
            const newId = nome.toLowerCase().replace(/\s/g, '_') + '_' + Date.now();
            cardapio.push({ id: newId, nome: nome, icone: icone, tipo: tipo });
            saveCardapioToLocalStorage(cardapio);
            carregarCardapioAdmin();
            atualizarRelatorioAdmin(); // Atualiza o relatório e o gráfico com o novo item
            itemNomeInput.value = '';
            itemTipoSelect.value = 'porcao';
            alert('Item adicionado ao cardápio!');
        } else {
            alert('Por favor, preencha o nome do alimento.');
        }
    });

    cardapioListAdmin.addEventListener('click', (e) => {
        if (e.target.classList.contains('delete-btn')) {
            const itemIdToDelete = e.target.dataset.id;
            if (confirm('Tem certeza que deseja remover este item do cardápio? Isso não apagará os dados de consumo anteriores deste item.')) {
                let cardapio = getCardapioFromLocalStorage();
                cardapio = cardapio.filter(item => item.id !== itemIdToDelete);
                saveCardapioToLocalStorage(cardapio);
                carregarCardapioAdmin();
                atualizarRelatorioAdmin(); // Atualiza o relatório e o gráfico após remoção
                alert('Item removido do cardápio!');
            }
        }
    });

    // --- Funções de Relatório e Gráfico ---
    function loadMerendaDataForReport() {
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
            console.error('Erro ao carregar dados de merenda para relatório:', e);
            contagemMerenda = {};
            numConfirmacoes = 0;
        }
        return { contagemMerenda, numConfirmacoes };
    }

    function atualizarRelatorioAdmin() {
        const { contagemMerenda, numConfirmacoes } = loadMerendaDataForReport();
        const cardapioDoDia = getCardapioFromLocalStorage();

        relatorioContagemDiv.innerHTML = '';
        let totalPorcoesGeral = 0;

        if (cardapioDoDia.length === 0) {
            relatorioContagemDiv.innerHTML = '<p class="info-message">O cardápio do dia não foi definido. Não há dados de merenda para exibir ou gerar relatório.</p>';
            if (merendaChart) { // Destroi o gráfico se não houver dados
                merendaChart.destroy();
                merendaChart = null;
            }
            return;
        }

        // Dados para o gráfico e exibição textual
        const chartLabels = [];
        const chartData = [];
        const backgroundColors = [];
        const borderColors = [];

        // Cores suaves para o gráfico
        const colors = [
            'rgba(124, 159, 89, 0.7)',  // accent-color
            'rgba(192, 140, 99, 0.7)', // secondary-color
            'rgba(136, 179, 219, 0.7)', // Um azul suave
            'rgba(255, 193, 7, 0.7)',   // Amarelo suave
            'rgba(220, 53, 69, 0.7)',   // Vermelho suave (erro)
            'rgba(108, 117, 125, 0.7)'  // Cinza suave
        ];
        const borderColorsList = [
            'rgba(124, 159, 89, 1)',
            'rgba(192, 140, 99, 1)',
            'rgba(136, 179, 219, 1)',
            'rgba(255, 193, 7, 1)',
            'rgba(220, 53, 69, 1)',
            'rgba(108, 117, 125, 1)'
        ];
        let colorIndex = 0;

        cardapioDoDia.forEach(item => {
            const count = contagemMerenda[item.id] || 0;
            totalPorcoesGeral += count;

            const p = document.createElement('p');
            p.innerHTML = `${item.nome} (${item.tipo === 'unidade' ? 'unidades' : 'porções'}): <span>${count}</span>`;
            relatorioContagemDiv.appendChild(p);

            // Adiciona dados para o gráfico apenas se houver consumo
            if (count > 0) {
                chartLabels.push(item.nome);
                chartData.push(count);
                backgroundColors.push(colors[colorIndex % colors.length]);
                borderColors.push(borderColorsList[colorIndex % borderColorsList.length]);
                colorIndex++;
            }
        });

        const pTotalAlunos = document.createElement('p');
        pTotalAlunos.innerHTML = `<strong>Total de Pratos Solicitados: <span>${numConfirmacoes}</span></strong>`;
        relatorioContagemDiv.appendChild(pTotalAlunos);

        const pTotalPorcoes = document.createElement('p');
        pTotalPorcoes.innerHTML = `<strong>Total Geral de Unidades/Porções Solicitadas: <span>${totalPorcoesGeral}</span></strong>`;
        relatorioContagemDiv.appendChild(pTotalPorcoes);

        // --- Gráfico com Chart.js ---
        const ctx = document.getElementById('merendaChart').getContext('2d');

        // Destroi o gráfico existente se houver
        if (merendaChart) {
            merendaChart.destroy();
        }

        if (chartData.length > 0) { // Cria o gráfico apenas se houver dados para exibir
            merendaChart = new Chart(ctx, {
                type: 'bar', // Tipo de gráfico: barra
                data: {
                    labels: chartLabels,
                    datasets: [{
                        label: 'Quantidade Consumida',
                        data: chartData,
                        backgroundColor: backgroundColors,
                        borderColor: borderColors,
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: 'Quantidade'
                            }
                        },
                        x: {
                            title: {
                                display: true,
                                text: 'Item de Merenda'
                            }
                        }
                    },
                    plugins: {
                        legend: {
                            display: false // Não exibir a legenda do dataset
                        },
                        title: {
                            display: true,
                            text: 'Demanda de Alimentos por Item',
                            font: {
                                size: 18,
                                family: 'Playfair Display',
                                weight: 'bold'
                            },
                            color: '#333'
                        }
                    }
                }
            });
        } else {
            // Se não houver dados, exibir uma mensagem no lugar do gráfico ou manter em branco
            // A div do canvas ficará vazia ou com o estilo padrão.
            // Poderíamos adicionar um parágrafo aqui com "Sem dados para o gráfico" se quisermos.
        }
    }


    // Função para gerar o relatório em PDF (atualizada para incluir o gráfico)
    gerarRelatorioPdfBtn.addEventListener('click', async () => {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('p', 'mm', 'a4'); // 'p' para retrato, 'mm' para milímetros, 'a4' para tamanho A4

        const dataAtual = new Date().toLocaleDateString('pt-BR', { dateStyle: 'full' });
        const horaAtual = new Date().toLocaleTimeString('pt-BR');
        const { contagemMerenda, numConfirmacoes } = loadMerendaDataForReport();
        const cardapioDoDia = getCardapioFromLocalStorage();

        let y = 20;

        doc.setFont("Playfair Display", "bold");
        doc.setFontSize(24);
        doc.text("Relatório de Demanda de Merenda", 105, y, null, null, "center");
        y += 10;
        doc.setFont("Montserrat", "normal");
        doc.setFontSize(14);
        doc.text(`Baú da Merenda Digital - ${dataAtual}`, 105, y, null, null, "center");
        y += 7;
        doc.text(`Hora: ${horaAtual}`, 105, y, null, null, "center");
        y += 20;

        doc.setFont("Montserrat", "normal");
        doc.setFontSize(16);
        doc.text("Resumo das Solicitações:", 20, y);
        y += 10;

        doc.setLineWidth(0.5);
        doc.line(20, y, 190, y);
        y += 10;

        let totalPorcoesGeral = 0;
        cardapioDoDia.forEach(item => {
            const count = contagemMerenda[item.id] || 0;
            totalPorcoesGeral += count;
            doc.setFontSize(14);
            doc.text(`${item.nome} (${item.tipo === 'unidade' ? 'unidades' : 'porções'}):`, 30, y);
            doc.text(`${count}`, 170, y, null, null, "right");
            y += 8;
        });

        y += 10;
        doc.setLineWidth(0.5);
        doc.line(20, y, 190, y);
        y += 10;

        doc.setFont("Montserrat", "bold");
        doc.setFontSize(16);
        doc.text("Total de Pratos Solicitados (Alunos):", 20, y);
        doc.text(`${numConfirmacoes}`, 190, y, null, null, "right");
        y += 8;

        doc.text("Total Geral de Unidades/Porções Solicitadas:", 20, y);
        doc.text(`${totalPorcoesGeral}`, 190, y, null, null, "right");
        y += 20;

        // Adicionar o gráfico ao PDF
        const chartCanvas = document.getElementById('merendaChart');
        if (chartCanvas && merendaChart) { // Verifica se o canvas e o gráfico existem
            // Ensure the chart is rendered for proper image generation
            merendaChart.resize(); // Resize to ensure it's up-to-date
            merendaChart.render();

            try {
                const imgData = await html2canvas(chartCanvas, { scale: 2 }).then(canvas => canvas.toDataURL('image/png'));
                const imgWidth = 180; // Largura da imagem no PDF
                const imgHeight = (canvas.height * imgWidth) / canvas.width;

                if (y + imgHeight > doc.internal.pageSize.height - 30) { // Se não couber, adiciona nova página
                    doc.addPage();
                    y = 20; // Reseta Y para nova página
                }

                doc.addImage(imgData, 'PNG', 15, y, imgWidth, imgHeight);
                y += imgHeight + 10; // Espaçamento após o gráfico
            } catch (error) {
                console.error('Erro ao gerar imagem do gráfico:', error);
                doc.setFont("Montserrat", "italic");
                doc.setFontSize(10);
                doc.text("Não foi possível gerar o gráfico no PDF.", 105, y + 10, null, null, "center");
                y += 20;
            }
        } else {
            doc.setFont("Montserrat", "italic");
            doc.setFontSize(10);
            doc.text("Nenhum gráfico de demanda disponível.", 105, y + 10, null, null, "center");
            y += 20;
        }

        doc.setFont("Montserrat", "italic");
        doc.setFontSize(10);
        doc.text("Este relatório reflete as escolhas de merenda registradas até o momento da geração.", 105, doc.internal.pageSize.height - 20, null, null, "center");
        doc.text("Gerado automaticamente pelo Baú da Merenda Digital.", 105, doc.internal.pageSize.height - 10, null, null, "center");

        doc.save(`relatorio_merenda_merendeira_${new Date().toISOString().slice(0, 10)}.pdf`);
    });


    // Função para zerar os dados do dia
    resetDadosBtn.addEventListener('click', () => {
        if (confirm('Tem certeza que deseja ZERAR TODOS OS DADOS de merenda do dia? Esta ação não pode ser desfeita.')) {
            localStorage.removeItem('bauMerendaContagem');
            localStorage.removeItem('bauMerendaNumConfirmacoes');
            atualizarRelatorioAdmin(); // Atualiza a exibição após zerar
            alert('Dados da merenda do dia zerados com sucesso!');
        }
    });

    // --- Event Listeners para Autenticação ---
    showCadastroBtn.addEventListener('click', () => {
        loginForm.style.display = 'none';
        cadastroForm.style.display = 'block';
        authMessage.textContent = ''; // Limpa mensagem
    });

    hideCadastroBtn.addEventListener('click', () => {
        loginForm.style.display = 'block';
        cadastroForm.style.display = 'none';
        authMessage.textContent = ''; // Limpa mensagem
    });

    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const usuario = document.getElementById('login-usuario').value;
        const senha = document.getElementById('login-senha').value;
        if (loginUser(usuario, senha)) {
            checkLogin();
        }
    });

    cadastroForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const usuario = document.getElementById('cadastro-usuario').value;
        const senha = document.getElementById('cadastro-senha').value;
        const confirmarSenha = document.getElementById('confirmar-senha').value;

        if (senha !== confirmarSenha) {
            authMessage.textContent = 'As senhas não coincidem!';
            authMessage.style.color = 'var(--error-red)';
            return;
        }
        if (registerUser(usuario, senha)) {
            loginForm.style.display = 'block';
            cadastroForm.style.display = 'none';
            cadastroForm.reset();
        }
    });

    logoutBtn.addEventListener('click', logout);

    // --- Inicialização ---
    checkLogin(); // Verifica se já está logado ao carregar a página

    // Adiciona um listener para atualizar o relatório se os dados da merenda ou cardápio mudarem
    window.addEventListener('storage', (event) => {
        if (event.key === 'bauMerendaContagem' || event.key === 'bauMerendaNumConfirmacoes' || event.key === 'cardapioDoDia') {
            if (sessionStorage.getItem('loggedInUser')) { // Atualiza apenas se estiver logado
                atualizarRelatorioAdmin();
                carregarCardapioAdmin();
            }
        }
    });
});