// =====================================================================
// ADMINISTRAÇÃO DE ENCADEAMENTOS – Fase 1.8C (VERSÃO FINAL)
// =====================================================================
// Gerencia criação, validação, importação/exportação de JSONs de parâmetros
// de correção monetária e juros de mora.
// Índices obtidos dinamicamente de window.INDEXADORES_ATUALIZACAO.
// Preserva índices importados mesmo se incompatíveis (com aviso),
// mas substitui automaticamente na criação/manual ao mudar tipo.
// =====================================================================

window.parametrosCorrecaoAtual = null;
window.parametrosJurosAtual = null;
window.parametrosSelicAtual = null;

// =====================================================================
// AUXILIARES
// =====================================================================

function adminCompetenciaParaNumero(str) {
    if (!str) return NaN;
    var partes = str.split('/');
    if (partes.length !== 2) return NaN;
    var mes = parseInt(partes[0], 10);
    var ano = parseInt(partes[1], 10);
    if (isNaN(mes) || isNaN(ano) || mes < 1 || mes > 12 || ano < 1900) return NaN;
    return ano * 100 + mes;
}

function adminProximaCompetenciaNumero(num) {
    var ano = Math.floor(num / 100);
    var mes = num % 100;
    if (mes === 12) return (ano + 1) * 100 + 1;
    return ano * 100 + (mes + 1);
}

function adminParseValorBrasileiro(texto) {
    if (!texto) return 0;
    var limpo = texto
        .replace(/[^0-9,.-]/g, '')
        .replace(/\./g, '')
        .replace(',', '.');
    return parseFloat(limpo) || 0;
}

function adminSanitizarNome(nome) {
    if (!nome) return 'ENCADEAMENTO_SEM_NOME';
    var semAcentos = nome.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    var sanitizado = semAcentos
        .toUpperCase()
        .replace(/\s+/g, '_')
        .replace(/[^A-Z0-9_]/g, '');
    sanitizado = sanitizado.replace(/_+/g, '_');
    sanitizado = sanitizado.replace(/^_|_$/g, '');
    return sanitizado || 'ENCADEAMENTO_SEM_NOME';
}

function adminGerarNomeArquivo(tipo, nome) {
    var nomeSanitizado = adminSanitizarNome(nome);
    var tipoMap = {
        'correcao_monetaria': 'correcao_monetaria',
        'juros_mora': 'juros_mora',
        'selic': 'selic',
        'taxa_legal': 'taxa_legal'
    };
    var prefixo = tipoMap[tipo] || 'parametro';
    return 'parametros_' + prefixo + '_' + nomeSanitizado + '.json';
}

function adminDataAtualFormatada() {
    var agora = new Date();
    var dia = String(agora.getDate()).padStart(2, '0');
    var mes = String(agora.getMonth() + 1).padStart(2, '0');
    var ano = agora.getFullYear();
    return dia + '/' + mes + '/' + ano;
}

// =====================================================================
// FUNÇÕES AUXILIARES PARA VERIFICAÇÃO DE ÍNDICES
// =====================================================================

function adminIndiceExisteNaBase(codigo) {
    if (!window.INDEXADORES_ATUALIZACAO) return false;
    return !!window.INDEXADORES_ATUALIZACAO[codigo];
}

function adminIndiceCompativelComTipo(codigo, tipoParametro) {
    if (!window.INDEXADORES_ATUALIZACAO) return false;
    var item = window.INDEXADORES_ATUALIZACAO[codigo];
    if (!item) return false;
    return item.tipo === tipoParametro;
}

function adminObterIndicesDisponiveisPorTipo(tipoParametro) {
    if (!window.INDEXADORES_ATUALIZACAO) {
        return [];
    }

    var resultados = [];
    var base = window.INDEXADORES_ATUALIZACAO;

    for (var chave in base) {
        if (base.hasOwnProperty(chave)) {
            var item = base[chave];
            if (item.tipo === tipoParametro) {
                resultados.push({
                    codigo: chave,
                    nome: item.nome || chave,
                    descricao: item.descricao || ''
                });
            }
        }
    }

    resultados.sort(function(a, b) {
        return a.nome.localeCompare(b.nome);
    });

    return resultados;
}

function adminVerificarBaseIndexadores() {
    if (!window.INDEXADORES_ATUALIZACAO) {
        adminExibirMensagem(
            'Aviso: base de indexadores não carregada. Verifique data/indexadores.js.',
            'warning'
        );
        return false;
    }
    return true;
}

// =====================================================================
// GERENCIAMENTO DO MODAL ADMINISTRATIVO
// =====================================================================

var adminModalCriado = false;
var adminEventosVinculados = false;
var adminTipoAtual = 'correcao_monetaria';

function criarModalAdmin() {
    if (document.getElementById('adminModal')) return;

    var overlay = document.createElement('div');
    overlay.id = 'adminModal';
    overlay.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-50 hidden modal-overlay';

    var modalContent = document.createElement('div');
    modalContent.className = 'bg-white p-6 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-xl';

    modalContent.innerHTML = `
        <h3 class="text-xl font-bold text-slate-800 mb-4">Administração de Parâmetros de Atualização</h3>

        <div id="adminMensagens" class="mb-4 p-3 rounded-md hidden"></div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
                <label class="block text-xs font-bold text-slate-600 uppercase mb-1">Tipo do parâmetro</label>
                <select id="adminTipoParametro" class="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm">
                    <option value="correcao_monetaria">Correção Monetária</option>
                    <option value="juros_mora">Juros de Mora</option>
                    <option value="selic" disabled>SELIC (futuro)</option>
                    <option value="taxa_legal" disabled>Taxa Legal (futuro)</option>
                </select>
            </div>
            <div>
                <label class="block text-xs font-bold text-slate-600 uppercase mb-1">Nome do encadeamento *</label>
                <input type="text" id="adminNome" placeholder="Ex: CJF_PREVIDENCIARIO_2025" class="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm">
            </div>
        </div>

        <div class="mb-4">
            <label class="block text-xs font-bold text-slate-600 uppercase mb-1">Descrição (opcional)</label>
            <textarea id="adminDescricao" rows="2" placeholder="Breve descrição do encadeamento..." class="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"></textarea>
        </div>

        <div class="mb-4">
            <div class="flex justify-between items-center mb-2">
                <h4 class="text-sm font-bold text-slate-700 uppercase tracking-wide">Períodos</h4>
                <button type="button" id="adminAdicionarLinha" class="px-3 py-1 bg-emerald-600 text-white text-xs rounded hover:bg-emerald-700 transition">+ Adicionar Linha</button>
            </div>
            <div class="overflow-x-auto">
                <table class="w-full text-sm border-collapse">
                    <thead>
                        <tr class="bg-slate-100 text-slate-600 text-xs uppercase">
                            <th class="p-2 text-left">Índice</th>
                            <th class="p-2 text-left">Data Inicial</th>
                            <th class="p-2 text-left">Data Final</th>
                            <th class="p-2 text-center">Ação</th>
                        </tr>
                    </thead>
                    <tbody id="adminTabelaPeriodos">
                    </tbody>
                </table>
            </div>
        </div>

        <div class="flex flex-wrap gap-3 mt-4 border-t border-slate-200 pt-4">
            <button type="button" id="adminValidar" class="px-4 py-2 bg-amber-600 text-white rounded-md hover:bg-amber-700 text-sm font-semibold shadow transition">Validar Encadeamento</button>
            <button type="button" id="adminExportar" class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-semibold shadow transition">Exportar JSON</button>
            <button type="button" id="adminImportar" class="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm font-semibold shadow transition">Importar JSON</button>
            <button type="button" id="adminFechar" class="px-4 py-2 border border-slate-300 text-slate-700 rounded-md hover:bg-slate-50 text-sm font-semibold transition">Fechar</button>
        </div>

        <input type="file" id="adminFileInput" accept=".json" class="hidden">
    `;

    overlay.appendChild(modalContent);
    document.body.appendChild(overlay);

    if (!window.INDEXADORES_ATUALIZACAO) {
        adminExibirMensagem(
            'Aviso: base de indexadores não carregada. Verifique data/indexadores.js.',
            'warning'
        );
    }

    var tbody = document.getElementById('adminTabelaPeriodos');
    if (tbody) adminAdicionarLinhaPeriodo();

    if (!adminEventosVinculados) {
        vincularEventosModal();
        adminEventosVinculados = true;
    }

    adminModalCriado = true;
}

// =====================================================================
// EVENTOS DO MODAL
// =====================================================================

function vincularEventosModal() {
    document.getElementById('adminFechar').addEventListener('click', function() {
        document.getElementById('adminModal').classList.add('hidden');
    });

    document.getElementById('adminModal').addEventListener('click', function(e) {
        if (e.target === this) this.classList.add('hidden');
    });

    document.getElementById('adminAdicionarLinha').addEventListener('click', function() {
        adminAdicionarLinhaPeriodo(); // preservarIncompativel = false (padrão)
    });

    document.getElementById('adminTipoParametro').addEventListener('change', function() {
        adminTipoAtual = this.value;
        adminAtualizarSelectsIndice();
    });

    document.getElementById('adminValidar').addEventListener('click', function() {
        var dados = adminColetarDados();
        var resultado = adminValidarDados(dados);
        if (resultado.erros.length === 0) {
            var msg = '✅ Encadeamento válido!';
            if (resultado.avisos.length > 0) {
                msg += '\n⚠️ Avisos:\n' + resultado.avisos.join('\n');
            }
            adminExibirMensagem(msg, 'success');
        } else {
            var msg = '❌ Erros:\n' + resultado.erros.join('\n');
            if (resultado.avisos.length > 0) {
                msg += '\n⚠️ Avisos:\n' + resultado.avisos.join('\n');
            }
            adminExibirMensagem(msg, 'error');
        }
    });

    document.getElementById('adminExportar').addEventListener('click', function() {
        var dados = adminColetarDados();
        var resultado = adminValidarDados(dados);
        if (resultado.erros.length > 0) {
            var msg = '❌ Não é possível exportar:\n' + resultado.erros.join('\n');
            if (resultado.avisos.length > 0) {
                msg += '\n⚠️ Avisos:\n' + resultado.avisos.join('\n');
            }
            adminExibirMensagem(msg, 'error');
            return;
        }
        adminExportarJSON(dados);
    });

    document.getElementById('adminImportar').addEventListener('click', function() {
        document.getElementById('adminFileInput').click();
    });

    document.getElementById('adminFileInput').addEventListener('change', function(e) {
        var file = e.target.files[0];
        if (!file) return;
        var reader = new FileReader();
        reader.onload = function(ev) {
            try {
                var json = JSON.parse(ev.target.result);
                adminImportarJSON(json);
            } catch (err) {
                adminExibirMensagem('❌ Erro ao ler o arquivo: ' + err.message, 'error');
            }
        };
        reader.readAsText(file);
        this.value = '';
    });
}

// =====================================================================
// FUNÇÕES DE LINHAS DA TABELA DE PERÍODOS
// =====================================================================

function adminObterIndicesDisponiveis() {
    var selectTipo = document.getElementById('adminTipoParametro');
    var tipo = selectTipo ? selectTipo.value : 'correcao_monetaria';
    return adminObterIndicesDisponiveisPorTipo(tipo);
}

function adminCriarSelectIndice(valorAtual, preservarIncompativel) {
    preservarIncompativel = preservarIncompativel || false;
    var tipoAtual = document.getElementById('adminTipoParametro').value;
    var indices = adminObterIndicesDisponiveisPorTipo(tipoAtual);
    var html = '<select class="admin-select-indice w-full px-2 py-1 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">';

    var existeNaBase = adminIndiceExisteNaBase(valorAtual);
    var compativel = adminIndiceCompativelComTipo(valorAtual, tipoAtual);

    // Caso especial: preservar incompatível (importação)
    if (preservarIncompativel && valorAtual && existeNaBase && !compativel) {
        html += '<option value="' + valorAtual + '" selected>' + valorAtual + ' (incompatível com ' + tipoAtual + ')</option>';
    }

    // Caso: índice não existe na base
    if (valorAtual && !existeNaBase) {
        html += '<option value="' + valorAtual + '" selected>' + valorAtual + ' (não cadastrado na base)</option>';
    }

    // Índices compatíveis
    if (indices.length === 0) {
        html += '<option value="">-- Nenhum índice disponível --</option>';
    } else {
        indices.forEach(function(item) {
            var selected = (item.codigo === valorAtual && compativel) ? 'selected' : '';
            var label = item.nome + ' (' + item.codigo + ')';
            html += '<option value="' + item.codigo + '" ' + selected + '>' + label + '</option>';
        });
    }

    html += '</select>';
    return html;
}

function adminAdicionarLinhaPeriodo(indice, inicio, fim, preservarIncompativel) {
    preservarIncompativel = preservarIncompativel || false;
    var tbody = document.getElementById('adminTabelaPeriodos');
    if (!tbody) return;

    var tr = document.createElement('tr');
    tr.className = 'border-b border-slate-200';

    var selectIndice = adminCriarSelectIndice(indice || '', preservarIncompativel);

    tr.innerHTML = `
        <td class="p-2">${selectIndice}</td>
        <td class="p-2"><input type="text" class="admin-data-inicio w-full px-2 py-1 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="MM/AAAA" value="${inicio || ''}"></td>
        <td class="p-2"><input type="text" class="admin-data-fim w-full px-2 py-1 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="MM/AAAA ou vazio" value="${fim || ''}"></td>
        <td class="p-2 text-center"><button type="button" class="admin-remover-linha text-red-600 hover:text-red-800 text-xs font-bold">✕</button></td>
    `;

    tbody.appendChild(tr);

    tr.querySelector('.admin-remover-linha').addEventListener('click', function() {
        if (tbody.children.length > 1) {
            tr.remove();
        } else {
            adminExibirMensagem('É necessário pelo menos uma linha.', 'warning');
        }
    });

    tr.querySelectorAll('.admin-data-inicio, .admin-data-fim').forEach(function(input) {
        input.addEventListener('input', function() {
            var v = this.value.replace(/\D/g, '');
            if (v.length > 6) v = v.substring(0, 6);
            if (v.length >= 3) {
                this.value = v.substring(0, 2) + '/' + v.substring(2);
            } else {
                this.value = v;
            }
        });
    });
}

function adminAtualizarSelectsIndice() {
    var tipoAtual = document.getElementById('adminTipoParametro').value;
    var indices = adminObterIndicesDisponiveisPorTipo(tipoAtual);
    var selects = document.querySelectorAll('#adminTabelaPeriodos .admin-select-indice');

    selects.forEach(function(sel) {
        var valorAtual = sel.value;
        var existeNaBase = adminIndiceExisteNaBase(valorAtual);
        var compativel = adminIndiceCompativelComTipo(valorAtual, tipoAtual);

        // Se o índice existe na base mas não é compatível, NÃO preservar (substitui)
        if (existeNaBase && !compativel) {
            var options = '';
            if (indices.length === 0) {
                options += '<option value="">-- Nenhum índice disponível --</option>';
            } else {
                indices.forEach(function(item) {
                    var selected = (item.codigo === indices[0].codigo) ? 'selected' : '';
                    var label = item.nome + ' (' + item.codigo + ')';
                    options += '<option value="' + item.codigo + '" ' + selected + '>' + label + '</option>';
                });
            }
            sel.innerHTML = options;
            return;
        }

        // Se o índice não existe na base, preserva como opção especial (mesmo em mudança de tipo)
        var existeNaLista = indices.some(function(item) {
            return item.codigo === valorAtual;
        });

        var options = '';

        if (valorAtual && !existeNaBase) {
            options += '<option value="' + valorAtual + '" selected>' + valorAtual + ' (não cadastrado na base)</option>';
        }

        if (indices.length === 0) {
            options += '<option value="">-- Nenhum índice disponível --</option>';
        } else {
            indices.forEach(function(item) {
                var selected = (item.codigo === valorAtual && existeNaBase) ? 'selected' : '';
                var label = item.nome + ' (' + item.codigo + ')';
                options += '<option value="' + item.codigo + '" ' + selected + '>' + label + '</option>';
            });
        }

        sel.innerHTML = options;

        if (!sel.value && indices.length > 0) {
            sel.value = indices[0].codigo;
        }
    });
}

// =====================================================================
// COLETA E VALIDAÇÃO DOS DADOS DO ADMIN
// =====================================================================

function adminColetarDados() {
    var tipo = document.getElementById('adminTipoParametro').value;
    var nome = document.getElementById('adminNome').value.trim();
    var descricao = document.getElementById('adminDescricao').value.trim();

    var linhas = document.querySelectorAll('#adminTabelaPeriodos tr');
    var periodos = [];
    linhas.forEach(function(tr) {
        var indiceSelect = tr.querySelector('.admin-select-indice');
        var inicioInput = tr.querySelector('.admin-data-inicio');
        var fimInput = tr.querySelector('.admin-data-fim');
        if (!indiceSelect || !inicioInput) return;

        var indice = indiceSelect.value;
        var inicio = inicioInput.value.trim();
        var fim = fimInput.value.trim();

        periodos.push({ indice: indice, inicio: inicio, fim: fim });
    });

    return { tipo: tipo, nome: nome, descricao: descricao, periodos: periodos };
}

function adminValidarDados(dados) {
    var erros = [];
    var avisos = [];

    if (!dados.nome) {
        erros.push('Nome do encadeamento é obrigatório.');
    }

    if (!dados.tipo) {
        erros.push('Tipo do parâmetro é obrigatório.');
    }

    if (dados.periodos.length === 0) {
        erros.push('Adicione pelo menos um período.');
        return { erros: erros, avisos: avisos };
    }

    var regexMMAAAA = /^\d{2}\/\d{4}$/;
    var periodosAbertos = 0;
    var periodoAnteriorFimNum = null;

    var periodosOrdenados = dados.periodos.slice().sort(function(a, b) {
        return adminCompetenciaParaNumero(a.inicio) - adminCompetenciaParaNumero(b.inicio);
    });

    var baseDisponivel = !!window.INDEXADORES_ATUALIZACAO;
    var base = window.INDEXADORES_ATUALIZACAO || {};

    for (var i = 0; i < periodosOrdenados.length; i++) {
        var p = periodosOrdenados[i];

        if (!p.indice) {
            erros.push('Linha ' + (i+1) + ': Índice não selecionado.');
            continue;
        }

        if (baseDisponivel) {
            if (!base[p.indice]) {
                avisos.push('Linha ' + (i+1) + ': Índice "' + p.indice + '" não existe na base atual de indexadores. Será mantido no JSON, mas pode não ser reconhecido futuramente.');
            } else {
                var tipoIndexador = base[p.indice].tipo;
                if (tipoIndexador !== dados.tipo) {
                    avisos.push('Linha ' + (i+1) + ': Índice "' + p.indice + '" pertence ao tipo "' + tipoIndexador + '", mas o encadeamento é do tipo "' + dados.tipo + '".');
                }
            }
        }

        if (!p.inicio || !regexMMAAAA.test(p.inicio)) {
            erros.push('Linha ' + (i+1) + ': Data inicial "' + p.inicio + '" inválida. Use MM/AAAA.');
            continue;
        }
        var numInicio = adminCompetenciaParaNumero(p.inicio);
        if (isNaN(numInicio)) {
            erros.push('Linha ' + (i+1) + ': Data inicial "' + p.inicio + '" inválida.');
            continue;
        }

        var numFim = null;
        if (p.fim) {
            if (!regexMMAAAA.test(p.fim)) {
                erros.push('Linha ' + (i+1) + ': Data final "' + p.fim + '" inválida. Use MM/AAAA ou deixe vazio.');
                continue;
            }
            numFim = adminCompetenciaParaNumero(p.fim);
            if (isNaN(numFim)) {
                erros.push('Linha ' + (i+1) + ': Data final "' + p.fim + '" inválida.');
                continue;
            }
            if (numFim < numInicio) {
                erros.push('Linha ' + (i+1) + ': Data final anterior à data inicial.');
                continue;
            }
        } else {
            periodosAbertos++;
            if (periodosAbertos > 1) {
                erros.push('Linha ' + (i+1) + ': Apenas um período pode estar aberto (sem data final).');
                continue;
            }
            numFim = Number.MAX_SAFE_INTEGER;
        }

        if (periodoAnteriorFimNum !== null && numInicio <= periodoAnteriorFimNum) {
            erros.push('Linha ' + (i+1) + ': Período se sobrepõe ao anterior (' + periodosOrdenados[i-1].inicio + ' a ' + (periodosOrdenados[i-1].fim || 'aberto') + ').');
        }

        periodoAnteriorFimNum = numFim;
    }

    return { erros: erros, avisos: avisos };
}

function adminExibirMensagem(texto, tipo) {
    var div = document.getElementById('adminMensagens');
    if (!div) return;
    div.classList.remove('hidden', 'bg-green-100', 'text-green-700', 'bg-red-100', 'text-red-700', 'bg-amber-100', 'text-amber-700');
    div.textContent = texto;
    div.style.whiteSpace = 'pre-wrap';

    if (tipo === 'success') {
        div.classList.add('bg-green-100', 'text-green-700');
    } else if (tipo === 'error') {
        div.classList.add('bg-red-100', 'text-red-700');
    } else if (tipo === 'warning') {
        div.classList.add('bg-amber-100', 'text-amber-700');
    }
}

// =====================================================================
// EXPORTAÇÃO DO JSON DE PARÂMETROS
// =====================================================================

function adminExportarJSON(dados) {
    var tipo = dados.tipo;
    var nome = dados.nome;
    var descricao = dados.descricao;
    var periodos = dados.periodos;

    var periodosOrdenados = periodos.slice().sort(function(a, b) {
        return adminCompetenciaParaNumero(a.inicio) - adminCompetenciaParaNumero(b.inicio);
    });

    var indices = [];
    periodosOrdenados.forEach(function(p) {
        if (p.indice && indices.indexOf(p.indice) === -1) {
            indices.push(p.indice);
        }
    });

    var jsonObj = {
        tipoArquivo: 'parametros_atualizacao',
        tipoParametro: tipo,
        versao: '1.0',
        nome: nome,
        descricao: descricao || '',
        dataCriacao: adminDataAtualFormatada(),
        indicesUtilizados: indices,
        periodos: periodosOrdenados.map(function(p) {
            return {
                indice: p.indice,
                inicio: p.inicio,
                fim: p.fim || ''
            };
        })
    };

    var jsonStr = JSON.stringify(jsonObj, null, 2);
    var blob = new Blob([jsonStr], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var link = document.createElement('a');

    var nomeArquivo = adminGerarNomeArquivo(tipo, nome);
    link.href = url;
    link.download = nomeArquivo;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    adminExibirMensagem('✅ JSON exportado com sucesso: ' + nomeArquivo, 'success');
}

// =====================================================================
// IMPORTAÇÃO DE JSON NO MODAL ADMIN
// =====================================================================

function adminImportarJSON(json) {
    if (json.tipoArquivo !== 'parametros_atualizacao') {
        adminExibirMensagem('❌ O arquivo não é um JSON de parâmetros de atualização.', 'error');
        return;
    }

    if (!json.tipoParametro || !json.nome || !json.periodos || json.periodos.length === 0) {
        adminExibirMensagem('❌ JSON inválido: faltam campos obrigatórios.', 'error');
        return;
    }

    var baseDisponivel = !!window.INDEXADORES_ATUALIZACAO;
    var indicesNaoEncontrados = [];
    var indicesTipoIncompativel = [];

    if (baseDisponivel) {
        var base = window.INDEXADORES_ATUALIZACAO;
        json.periodos.forEach(function(p) {
            if (p.indice) {
                if (!base[p.indice]) {
                    if (indicesNaoEncontrados.indexOf(p.indice) === -1) {
                        indicesNaoEncontrados.push(p.indice);
                    }
                } else if (base[p.indice].tipo !== json.tipoParametro) {
                    if (indicesTipoIncompativel.indexOf(p.indice) === -1) {
                        indicesTipoIncompativel.push(p.indice);
                    }
                }
            }
        });
    }

    var selectTipo = document.getElementById('adminTipoParametro');
    if (selectTipo) {
        var option = selectTipo.querySelector('option[value="' + json.tipoParametro + '"]');
        if (option) {
            selectTipo.value = json.tipoParametro;
            adminTipoAtual = json.tipoParametro;
        } else {
            adminExibirMensagem('⚠️ Tipo "' + json.tipoParametro + '" não suportado. Será usado "correcao_monetaria".', 'warning');
            selectTipo.value = 'correcao_monetaria';
            adminTipoAtual = 'correcao_monetaria';
        }
    }

    document.getElementById('adminNome').value = json.nome || '';
    document.getElementById('adminDescricao').value = json.descricao || '';

    var tbody = document.getElementById('adminTabelaPeriodos');
    tbody.innerHTML = '';

    // Importação: preservar índices incompatíveis.
    json.periodos.forEach(function(p) {
        adminAdicionarLinhaPeriodo(p.indice, p.inicio, p.fim || '', true);
    });

    var msg = '✅ JSON importado com sucesso!';

    if (indicesNaoEncontrados.length > 0) {
        msg += '\n⚠️ Aviso: os seguintes índices não foram encontrados na base atual: ' +
            indicesNaoEncontrados.join(', ') +
            '. Eles foram preservados, mas podem não ser reconhecidos.';
    }

    if (indicesTipoIncompativel.length > 0) {
        msg += '\n⚠️ Aviso: os seguintes índices pertencem a outro tipo de parâmetro: ' +
            indicesTipoIncompativel.join(', ') +
            '. Eles foram preservados como incompatíveis com o tipo "' +
            json.tipoParametro +
            '".';
    }

    adminExibirMensagem(
        msg,
        (indicesNaoEncontrados.length > 0 || indicesTipoIncompativel.length > 0) ? 'warning' : 'success'
    );

    // Não chamar adminAtualizarSelectsIndice() aqui.
    // As linhas importadas já foram criadas com preservarIncompativel = true.
    // Chamar adminAtualizarSelectsIndice() aqui pode substituir índices incompatíveis preservados.
}

// =====================================================================
// FUNÇÃO PARA CARREGAR PARÂMETROS NA GUIA 5
// =====================================================================

function adminCarregarParametroGuia5(file, tipoEsperado) {
    var reader = new FileReader();
    reader.onload = function(e) {
        try {
            var json = JSON.parse(e.target.result);
            if (json.tipoArquivo !== 'parametros_atualizacao') {
                adminExibirMensagemGuia5('O arquivo não é um JSON de parâmetros de atualização.', 'error', tipoEsperado);
                return;
            }
            if (json.tipoParametro !== tipoEsperado) {
                var nomeEsperado = tipoEsperado === 'correcao_monetaria' ? 'correção monetária' : 'juros de mora';
                adminExibirMensagemGuia5('Este arquivo não é de ' + nomeEsperado + '.', 'error', tipoEsperado);
                return;
            }
            if (!json.nome || !json.periodos || json.periodos.length === 0) {
                adminExibirMensagemGuia5('JSON inválido: faltam campos obrigatórios.', 'error', tipoEsperado);
                return;
            }

            var baseDisponivel = !!window.INDEXADORES_ATUALIZACAO;
            var indicesNaoEncontrados = [];
            var indicesTipoIncompativel = [];
            if (baseDisponivel) {
                var base = window.INDEXADORES_ATUALIZACAO;
                json.periodos.forEach(function(p) {
                    if (p.indice) {
                        if (!base[p.indice]) {
                            if (indicesNaoEncontrados.indexOf(p.indice) === -1) {
                                indicesNaoEncontrados.push(p.indice);
                            }
                        } else if (base[p.indice].tipo !== json.tipoParametro) {
                            if (indicesTipoIncompativel.indexOf(p.indice) === -1) {
                                indicesTipoIncompativel.push(p.indice);
                            }
                        }
                    }
                });
            }

            if (tipoEsperado === 'correcao_monetaria') {
                window.parametrosCorrecaoAtual = json;
                var msg = '✅ Parâmetros de correção carregados com sucesso!\n' +
                          'Nome: ' + json.nome + '\n' +
                          'Descrição: ' + (json.descricao || 'N/A') + '\n' +
                          'Índices: ' + (json.indicesUtilizados ? json.indicesUtilizados.join(', ') : 'N/A') + '\n' +
                          'Períodos: ' + json.periodos.length;
                if (indicesNaoEncontrados.length > 0) {
                    msg += '\n⚠️ Atenção: índices não encontrados na base: ' + indicesNaoEncontrados.join(', ');
                }
                if (indicesTipoIncompativel.length > 0) {
                    msg += '\n⚠️ Atenção: índices incompatíveis com o tipo: ' + indicesTipoIncompativel.join(', ');
                }
                adminExibirMensagemGuia5(msg, 'success', tipoEsperado);
            } else if (tipoEsperado === 'juros_mora') {
                window.parametrosJurosAtual = json;
                var msg = '✅ Parâmetros de juros carregados com sucesso!\n' +
                          'Nome: ' + json.nome + '\n' +
                          'Descrição: ' + (json.descricao || 'N/A') + '\n' +
                          'Índices: ' + (json.indicesUtilizados ? json.indicesUtilizados.join(', ') : 'N/A') + '\n' +
                          'Períodos: ' + json.periodos.length;
                if (indicesNaoEncontrados.length > 0) {
                    msg += '\n⚠️ Atenção: índices não encontrados na base: ' + indicesNaoEncontrados.join(', ');
                }
                if (indicesTipoIncompativel.length > 0) {
                    msg += '\n⚠️ Atenção: índices incompatíveis com o tipo: ' + indicesTipoIncompativel.join(', ');
                }
                adminExibirMensagemGuia5(msg, 'success', tipoEsperado);
            }
        } catch (err) {
            adminExibirMensagemGuia5('Erro ao ler o arquivo: ' + err.message, 'error', tipoEsperado);
        }
    };
    reader.readAsText(file);
}

function adminExibirMensagemGuia5(texto, tipo, tipoEsperado) {
    var statusId = tipoEsperado === 'correcao_monetaria' ? 'statusCorrecao' : 'statusJuros';
    var div = document.getElementById(statusId);
    if (!div) return;
    div.className = 'text-sm p-2 rounded-md mt-1';
    if (tipo === 'success') {
        div.className += ' bg-green-100 text-green-700';
    } else if (tipo === 'error') {
        div.className += ' bg-red-100 text-red-700';
    } else {
        div.className += ' bg-slate-100 text-slate-600';
    }
    div.textContent = texto;
    div.style.whiteSpace = 'pre-wrap';
}

// =====================================================================
// COLETA DE DIFERENÇAS DA GUIA 4 (PREPARAÇÃO PARA FUTURO)
// =====================================================================

function coletarDiferencasParaAtualizacao() {
    var rows = document.querySelectorAll('#corpoDiferencas tr');
    var resultados = [];

    rows.forEach(function(tr) {
        var competencia = tr.dataset.competencia;
        if (!competencia) return;

        var diffEl = tr.querySelector('.diferenca-devida');
        if (!diffEl) return;

        var valorTexto = diffEl.textContent.trim();
        var valorNum = adminParseValorBrasileiro(valorTexto);
        if (isNaN(valorNum)) return;

        resultados.push({
            competencia: competencia,
            diferenca: valorNum
        });
    });

    return resultados;
}

// =====================================================================
// SINCRONIZAÇÃO DAS DATAS DA GUIA 1 PARA GUIA 5
// =====================================================================

function sincronizarParametrosAtualizacao() {
    var dataAtualizacao1 = document.getElementById('dataAtualizacao');
    var dataAtualizacao2 = document.getElementById('dataAtualizacao2');
    var inicioJuros1 = document.getElementById('inicioJuros');
    var inicioJuros2 = document.getElementById('inicioJuros2');

    if (dataAtualizacao1 && dataAtualizacao2 && !dataAtualizacao2.value) {
        dataAtualizacao2.value = dataAtualizacao1.value;
    }
    if (inicioJuros1 && inicioJuros2 && !inicioJuros2.value) {
        inicioJuros2.value = inicioJuros1.value;
    }
}

// =====================================================================
// INICIALIZAÇÃO – DOMContentLoaded
// =====================================================================

document.addEventListener('DOMContentLoaded', function() {
    criarModalAdmin();

    document.addEventListener('keydown', function(e) {
        var tag = e.target.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

        if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'e') {
            e.preventDefault();
            var modal = document.getElementById('adminModal');
            if (modal) {
                modal.classList.remove('hidden');
                var msgDiv = document.getElementById('adminMensagens');
                if (msgDiv) {
                    msgDiv.classList.add('hidden');
                    msgDiv.textContent = '';
                }
                if (!window.INDEXADORES_ATUALIZACAO) {
                    adminExibirMensagem(
                        'Aviso: base de indexadores não carregada. Verifique data/indexadores.js.',
                        'warning'
                    );
                }
                adminAtualizarSelectsIndice();
            }
        }
    });

    var btnCorrecao = document.getElementById('btnCarregarCorrecao');
    var fileCorrecao = document.getElementById('fileInputCorrecao');
    if (btnCorrecao && fileCorrecao) {
        btnCorrecao.addEventListener('click', function() {
            fileCorrecao.click();
        });
        fileCorrecao.addEventListener('change', function(e) {
            var file = e.target.files[0];
            if (file) {
                adminCarregarParametroGuia5(file, 'correcao_monetaria');
            }
            this.value = '';
        });
    }

    var btnJuros = document.getElementById('btnCarregarJuros');
    var fileJuros = document.getElementById('fileInputJuros');
    if (btnJuros && fileJuros) {
        btnJuros.addEventListener('click', function() {
            fileJuros.click();
        });
        fileJuros.addEventListener('change', function(e) {
            var file = e.target.files[0];
            if (file) {
                adminCarregarParametroGuia5(file, 'juros_mora');
            }
            this.value = '';
        });
    }

    document.querySelectorAll('.nav-guia button').forEach(function(btn) {
        btn.addEventListener('click', function() {
            if (this.dataset.guia === 'atualizacao') {
                sincronizarParametrosAtualizacao();
            }
        });
    });

    var guiaAtiva = document.querySelector('.nav-guia button.ativo');
    if (guiaAtiva && guiaAtiva.dataset.guia === 'atualizacao') {
        sincronizarParametrosAtualizacao();
    }

    window.coletarDiferencasParaAtualizacao = coletarDiferencasParaAtualizacao;
    window.sincronizarParametrosAtualizacao = sincronizarParametrosAtualizacao;
});
