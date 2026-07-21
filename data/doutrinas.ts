import { Doutrina } from '@/types'

export const DOUTRINAS: Doutrina[] = [
  {
    id: 'bibliologia',
    nome: 'Bibliologia',
    descricao: 'O estudo da Bíblia Sagrada — sua origem divina, inspiração, canonicidade, autoridade e preservação ao longo dos séculos.',
    icon: '📖',
    color: 'from-amber-500 to-orange-600',
    topicos: [
      {
        titulo: 'Inspiração das Escrituras',
        conteudo: 'A doutrina da inspiração afirma que as Escrituras foram divinamente expiradas (theopneustos) por Deus. O Espírito Santo supervisionou soberanamente os escritores humanos de tal forma que, utilizando suas próprias personalidades, vocabulários, estilos literários e contextos históricos, eles registraram com precisão absoluta a revelação de Deus, sem qualquer erro nos manuscritos originais (autógrafos).\n\nIsso é teologicamente referido como inspiração verbal e plenária. "Verbal" significa que a inspiração se estende às próprias palavras utilizadas, e não apenas aos conceitos ou ideias gerais. "Plenária" significa que esta inspiração cobre a totalidade das Escrituras, de Gênesis a Apocalipse, incluindo passagens históricas, genealógicas e proféticas. A Bíblia não "contém" a Palavra de Deus, ela "é" a Palavra de Deus.',
        versiculos: ['2Tm 3:16-17', '2Pe 1:20-21', 'Mt 5:18', 'Jo 10:35', '1Co 2:13']
      },
      {
        titulo: 'Inerrância e Infalibilidade',
        conteudo: 'A inerrância afirma que quando todos os fatos são conhecidos, as Escrituras em seus manuscritos originais e devidamente interpretadas mostrarão ser completamente verdadeiras em tudo o que afirmam. Sejam assuntos de teologia, história, ciência ou qualquer outro campo de conhecimento, a Bíblia não contém erros. Deus, que é a própria verdade, não pode inspirar o erro.\n\nA infalibilidade, um conceito intimamente ligado, afirma que as Escrituras são absolutamente seguras e confiáveis, e nunca falharão em cumprir seus propósitos divinos. A Palavra de Deus possui autoridade suprema e final sobre todas as questões de fé e prática, suplantando a tradição humana, a razão filosófica ou a experiência subjetiva.',
        versiculos: ['Sl 119:160', 'Pv 30:5-6', 'Jo 17:17', 'Rm 3:4', 'Hb 6:18']
      },
      {
        titulo: 'Canonicidade e Iluminação',
        conteudo: 'O cânon bíblico é a coleção dos 66 livros (39 no AT e 27 no NT) reconhecidos como divinamente inspirados e, portanto, autoritativos. A canonicidade não foi "decidida" pela Igreja em concílios, mas sim "descoberta" e reconhecida. A Igreja reconheceu as marcas da autoria divina (profética/apostólica, ortodoxia, catolicidade e poder transformador) que esses livros já possuíam inerentemente.\n\nPara que o crente compreenda esta revelação objetiva, é necessária a Iluminação do Espírito Santo. O homem natural não pode discernir as coisas do Espírito, portanto, o mesmo Espírito que inspirou a Palavra agora ilumina a mente do leitor regenerado para compreender, aceitar e aplicar a verdade espiritual.',
        versiculos: ['Ap 22:18-19', '1Co 2:14', 'Sl 119:18', 'Ef 1:17-18']
      }
    ]
  },
  {
    id: 'teologia-propria',
    nome: 'Teologia Própria',
    descricao: 'O estudo da natureza, atributos essenciais, existência e obras de Deus — incluindo o profundo mistério da Trindade.',
    icon: '✨',
    color: 'from-purple-500 to-violet-600',
    topicos: [
      {
        titulo: 'A Existência e Conhecimento de Deus',
        conteudo: 'As Escrituras assumem a existência de Deus desde o primeiro versículo ("No princípio, criou Deus..."), sem tentar prová-la filosoficamente. No entanto, a teologia cristã reconhece argumentos cosmológicos (toda causa tem um causador não causado), teleológicos (o design inteligente do universo), e morais (a lei moral universal exige um Legislador).\n\nDeus é incompreensível (não podemos conhecê-lo exaustivamente), mas Ele é cognoscível (podemos conhecê-lo verdadeiramente porque Ele se revelou). A revelação geral (criação e consciência) deixa a humanidade inescusável, mas apenas a revelação especial (Cristo e as Escrituras) traz o conhecimento salvífico de Deus.',
        versiculos: ['Gn 1:1', 'Sl 19:1', 'Rm 1:19-20', 'Hb 11:6', 'Dt 29:29']
      },
      {
        titulo: 'Os Atributos Incomunicáveis',
        conteudo: 'Os atributos de Deus são divididos em incomunicáveis (aqueles que Deus não compartilha com as criaturas) e comunicáveis (aqueles que Ele compartilha, em certa medida, conosco). Seus atributos incomunicáveis incluem a Asseidade (Sua independência absoluta e autoexistência), Imutabilidade (Sua essência e propósitos não mudam), e Eternidade (Ele existe fora e acima do tempo).\n\nAlém disso, Deus possui Onipresença (está presente em toda a plenitude do Seu ser em todos os lugares), Onisciência (conhece perfeitamente a Si mesmo e todas as coisas reais e possíveis) e Onipotência (pode fazer toda a Sua santa vontade sem esforço).',
        versiculos: ['Ex 3:14', 'Ml 3:6', 'Sl 90:2', 'Sl 139:7-10', 'Jó 42:2']
      },
      {
        titulo: 'O Mistério da Santíssima Trindade',
        conteudo: 'A Trindade é a doutrina distintiva central da fé cristã. Afirma que existe um único Deus, que subsiste eternamente em três Pessoas coiguais e coeternas: o Pai, o Filho e o Espírito Santo. A essência divina é indivisa, mas as Pessoas são distintas em suas relações e papéis econômicos (na salvação).\n\nNão são três deuses (Triteísmo), nem uma única pessoa se manifestando de três formas diferentes (Modalismo). O Pai é Deus, o Filho é Deus, o Espírito é Deus, mas o Pai não é o Filho, o Filho não é o Espírito, e o Espírito não é o Pai. É um mistério transcendente revelado nas Escrituras.',
        versiculos: ['Dt 6:4', 'Mt 3:16-17', 'Mt 28:19', '2Co 13:14', 'Jo 1:1', 'At 5:3-4']
      }
    ]
  },
  {
    id: 'cristologia',
    nome: 'Cristologia',
    descricao: 'O estudo da pessoa e obra de Jesus Cristo — sua eterna divindade, sua verdadeira humanidade, a encarnação e a expiação.',
    icon: '✝️',
    color: 'from-blue-500 to-cyan-600',
    topicos: [
      {
        titulo: 'A Divindade e Preexistência',
        conteudo: 'Jesus Cristo não passou a existir na manjedoura de Belém; Ele é o Verbo eterno que estava com Deus e era Deus. A doutrina da preexistência e da divindade absoluta de Cristo é o pilar da salvação. Ele possui os atributos exclusivos da divindade, perdoa pecados por Sua própria autoridade e recebe adoração (o que seria blasfêmia se Ele não fosse Deus).\n\nComo a segunda Pessoa da Trindade, o Filho é o agente da criação, o sustentador do universo e a exata expressão do ser de Deus (Hb 1:3). Negar a divindade de Cristo, como fez o arianismo e fazem seitas modernas, é negar o cerne do Evangelho.',
        versiculos: ['Jo 1:1-3', 'Jo 8:58', 'Cl 1:15-17', 'Hb 1:3', 'Fp 2:6', 'Jo 20:28']
      },
      {
        titulo: 'A Humanidade e a União Hipostática',
        conteudo: 'Para redimir a humanidade, o Verbo encarnou. Jesus assumiu uma natureza humana completa e genuína, com corpo físico, mente, vontade e emoções humanas. Ele conheceu a fadiga, a fome, a tristeza e a dor. Contudo, Ele era perfeitamente sem pecado. Sua encarnação se deu através do nascimento virginal, uma obra miraculosa do Espírito Santo.\n\nA União Hipostática é o mistério de que em Cristo, a natureza divina e a natureza humana estão unidas em uma única Pessoa (Hipóstase) para sempre. Estas naturezas são unidas "sem confusão, sem mudança, sem divisão e sem separação", conforme o Concílio de Calcedônia (451 d.C.).',
        versiculos: ['Jo 1:14', 'Lc 1:35', 'Fp 2:7-8', 'Hb 4:15', 'Cl 2:9', '1Tm 2:5']
      },
      {
        titulo: 'A Obra Expiatória',
        conteudo: 'A cruz não foi um acidente trágico, mas o plano redentor eterno de Deus. A obra de Cristo é descrita como Expiação Substitutiva (Ele morreu em nosso lugar, recebendo a penalidade que merecíamos), Propiciação (Sua morte satisfez a justa e santa ira de Deus contra o pecado), Redenção (Ele comprou pecadores escravizados pagando o preço do Seu sangue), e Reconciliação (restaurando a paz entre Deus e os homens).\n\nA obra salvífica culmina com Sua ressurreição corporal gloriosa, que valida Sua identidade divina, prova que o sacrifício foi aceito pelo Pai, e garante a nossa própria justificação e futura ressurreição.',
        versiculos: ['Is 53:5-10', 'Rm 3:24-25', '2Co 5:21', '1Pe 2:24', '1Co 15:3-4', 'Hb 9:12']
      }
    ]
  },
  {
    id: 'pneumatologia',
    nome: 'Pneumatologia (Paracletologia)',
    descricao: 'O estudo da terceira Pessoa da Trindade, o Espírito Santo (Parácleto) — Sua pessoa divina, Seus dons e Sua obra santificadora.',
    icon: '🕊️',
    color: 'from-sky-400 to-blue-500',
    topicos: [
      {
        titulo: 'A Personalidade e Divindade',
        conteudo: 'O Espírito Santo não é uma força impessoal, uma "energia cósmica" ou apenas o poder de Deus em ação. Ele é uma Pessoa Divina real, com intelecto (Ele sonda e conhece), emoções (Ele pode ser entristecido) e vontade (Ele distribui dons conforme quer).\n\nAs Escrituras atestam Sua plena divindade chamando-O explicitamente de Deus (como na repreensão de Pedro a Ananias), atribuindo a Ele os atributos exclusivos da divindade (onipresença, onisciência, eternidade) e associando-O em total igualdade com o Pai e o Filho na fórmula batismal e nas bênçãos apostólicas.',
        versiculos: ['At 5:3-4', 'Jo 14:16-17', '1Co 2:10-11', '1Co 12:11', 'Ef 4:30', 'Hb 9:14']
      },
      {
        titulo: 'A Obra de Salvação e Santificação',
        conteudo: 'No plano da redenção, o Espírito aplica a obra que Cristo consumou. Ele convence o mundo do pecado, da justiça e do juízo. Ele opera a Regeneração (o novo nascimento), infundindo vida espiritual onde havia morte. No momento da salvação, Ele habita permanentemente no crente, batizando-o no Corpo de Cristo e selando-o como garantia (penhor) até o dia da redenção final.\n\nApós a salvação, inicia-se a obra de Santificação. O Espírito (Parácleto/Consolador) age como Ajudador contínuo, capacitando o crente a mortificar os feitos da carne, guiando-o à verdade, intercedendo em oração e produzindo progressivamente o caráter de Cristo.',
        versiculos: ['Jo 16:8', 'Tt 3:5', '1Co 12:13', 'Ef 1:13-14', 'Rm 8:13', 'Jo 14:26']
      },
      {
        titulo: 'Os Dons e o Fruto do Espírito',
        conteudo: 'O Espírito concede dons espirituais (carismas) a cada membro do Corpo visando a edificação da Igreja. Estes não são talentos naturais, mas capacitações divinas soberanamente distribuídas. Enquanto os dons focam no "serviço", o "Fruto do Espírito" foca no "caráter".\n\nO Fruto do Espírito é a marca inconfundível de uma vida habitada por Deus: amor, alegria, paz, longanimidade, benignidade, bondade, fidelidade, mansidão e domínio próprio. Uma igreja pode operar muitos dons e ainda ser carnal (como Corinto), mas o Fruto é a prova incontestável da maturidade e submissão ao Espírito Santo.',
        versiculos: ['1Co 12:4-11', 'Rm 12:6-8', 'Gl 5:22-23', 'Ef 4:11-12', '1Pe 4:10-11']
      }
    ]
  },
  {
    id: 'antropologia',
    nome: 'Antropologia',
    descricao: 'O estudo bíblico do ser humano — nossa criação à imagem de Deus, nossa constituição bipartida/tripartida e o propósito da vida.',
    icon: '👤',
    color: 'from-green-500 to-emerald-600',
    topicos: [
      {
        titulo: 'A Criação e a Imago Dei',
        conteudo: 'Diferente do mundo secular que vê a humanidade como um acidente cósmico evolutivo, a Antropologia Bíblica fundamenta a dignidade humana no ato criativo de Deus. O homem não evoluiu de animais inferiores, mas foi formado do pó e recebeu o fôlego divino diretamente (criação fiat).\n\nO aspecto mais profundo desta criação é a Imago Dei (Imagem de Deus). Homem e mulher foram criados à imagem e semelhança de Deus, o que confere a eles a capacidade moral, racional, espiritual e relacional para dominar sobre a criação e ter comunhão com o Criador. Esta imagem foi distorcida pela Queda, mas nunca aniquilada.',
        versiculos: ['Gn 1:26-28', 'Gn 2:7', 'Sl 8:3-5', 'At 17:26-28', 'Tg 3:9']
      },
      {
        titulo: 'A Constituição Humana',
        conteudo: 'A teologia debate a constituição interna do ser humano. A visão Dicotômica afirma que o homem tem duas partes: material (corpo) e imaterial (alma/espírito usados como sinônimos). A visão Tricotômica defende três partes: corpo, alma (intelecto, emoção, vontade) e espírito (a faculdade de comunhão com Deus).\n\nIndependentemente da visão adotada, a Bíblia ensina a unidade intrínseca da pessoa humana. O corpo não é a "prisão má da alma" (como no platonismo), mas algo bom criado por Deus, que será ressuscitado e glorificado no último dia. O homem inteiro (material e imaterial) é alvo da redenção.',
        versiculos: ['1Ts 5:23', 'Hb 4:12', 'Mt 10:28', '1Co 15:42-44', 'Rm 8:23']
      }
    ]
  },
  {
    id: 'hamartiologia',
    nome: 'Hamartiologia',
    descricao: 'O exame minucioso da natureza do pecado, o mistério de sua origem, e o alcance de sua contaminação (Pecado Original).',
    icon: '⚠️',
    color: 'from-red-500 to-rose-600',
    topicos: [
      {
        titulo: 'A Queda e a Natureza do Pecado',
        conteudo: 'O pecado não se originou com a humanidade, mas no reino angelical com a rebelião de Lúcifer. Na terra, ele entrou pela desobediência voluntária de Adão e Eva no Éden. O pecado é essencialmente uma violação (anomia) e rebelião contra o caráter santo e a lei moral de Deus. \n\nO pecado não é apenas um ato ruim, mas um estado de rebelião e inimizade, um "errar o alvo" (hamartia) da glória de Deus. Ele engloba atos cometidos ativamente (pecados de comissão), o bem que se deixa de fazer (omissão) e até as intenções sombrias do coração e da mente.',
        versiculos: ['Gn 3:1-7', '1Jo 3:4', 'Rm 3:23', 'Tg 4:17', 'Is 14:12-14']
      },
      {
        titulo: 'O Pecado Original e Imputação',
        conteudo: 'A doutrina do Pecado Original explica que a ofensa de Adão teve consequências catastróficas para toda a raça humana. Como cabeça federal e representante da humanidade, a culpa do seu primeiro pecado foi imputada (creditada) a todos nós. Mais do que isso, herdamos dele uma natureza moralmente corrompida.\n\nPor causa desta natureza herdada (depravação inerente), não nos tornamos pecadores porque pecamos; nós pecamos porque já nascemos pecadores. A morte espiritual, física e, eventualmente, eterna é o salário direto dessa condição universal.',
        versiculos: ['Rm 5:12-21', 'Sl 51:5', 'Ef 2:1-3', 'Rm 6:23', '1Co 15:22']
      },
      {
        titulo: 'A Depravação Total',
        conteudo: 'O conceito teológico de "Depravação Total" (ou inabilidade radical) não significa que os seres humanos cometem todo tipo de atrocidade possível o tempo todo. Significa que a corrupção do pecado penetrou na totalidade do ser humano — mente, vontade, afeto, corpo — de modo que nenhuma parte permaneceu intocada.\n\nComo resultado, o homem natural está "morto em delitos e pecados". Ele não tem a capacidade moral nem o desejo de buscar genuinamente a Deus, de agradar a Ele ou de contribuir em absolutamente nada para sua própria salvação, a menos que o Espírito Santo o regenere primeiro.',
        versiculos: ['Rm 3:10-18', 'Jr 17:9', 'Ef 2:1-5', 'Jo 6:44', 'Rm 8:7-8']
      }
    ]
  },
  {
    id: 'soteriologia',
    nome: 'Soteriologia',
    descricao: 'O estudo da Salvação Divina — abrangendo eleição, chamamento, regeneração, fé, arrependimento, justificação e glorificação.',
    icon: '🛐',
    color: 'from-indigo-500 to-purple-600',
    topicos: [
      {
        titulo: 'Eleição e Graça Soberana',
        conteudo: 'Antes da fundação do mundo, Deus o Pai, em um ato de livre e soberana graça, elegeu (escolheu) pecadores para a salvação em Cristo Jesus. Esta eleição incondicional não se baseia em nenhuma virtude, fé prevista ou mérito no homem, mas repousa puramente no beneplácito da vontade divina.\n\nA salvação é uma obra monergística no seu início: Deus inicia o chamado eficaz (interno) através do Espírito Santo, que desperta o pecador que estava morto, garantindo que todos os que o Pai deu ao Filho virão a Ele infalivelmente.',
        versiculos: ['Ef 1:4-5', 'Rm 8:29-30', 'Jo 6:37-44', '2Ts 2:13', 'Rm 9:11-16']
      },
      {
        titulo: 'Regeneração, Fé e Arrependimento',
        conteudo: 'A Regeneração (novo nascimento) é a ressurreição espiritual da alma, operada secretamente e instantaneamente pelo Espírito Santo. O homem natural recebe um novo coração. Como consequência inevitável dessa nova vida, o pecador exerce a Conversão, que tem dois lados da mesma moeda: Fé e Arrependimento.\n\nA Fé salvífica não é apenas assentimento intelectual, mas confiança total e repouso na pessoa e obra de Cristo. O Arrependimento verdadeiro não é apenas remorso pelas consequências do pecado, mas uma mudança profunda de mente e direção, detestando o pecado e voltando-se inteiramente para Deus.',
        versiculos: ['Jo 3:3-8', 'Ez 36:26', 'Ef 2:8-9', 'At 11:18', '2Co 7:10', 'Hb 11:1']
      },
      {
        titulo: 'Justificação e Adoção',
        conteudo: 'A Justificação é um ato jurídico e forense de Deus. Nela, Deus declara o pecador absolutamente justo perante o tribunal divino. Isso ocorre pela "Dupla Imputação": nossos pecados foram creditados a Cristo na cruz (Ele levou nossa culpa), e a perfeita justiça e obediência de Cristo é creditada (imputada) a nós pela fé.\n\nSimultaneamente, a Adoção nos retira do tribunal e nos coloca na sala de estar de Deus, transferindo-nos da família da ira para a família do Altíssimo, tornando-nos filhos amados, herdeiros de Deus e coerdeiros com Cristo.',
        versiculos: ['Rm 3:21-26', '2Co 5:21', 'Gl 2:16', 'Rm 4:1-8', 'Gl 4:4-7', '1Jo 3:1-2']
      },
      {
        titulo: 'Santificação Progressiva e Glorificação',
        conteudo: 'Enquanto a Justificação é um ato instantâneo que nos livra da penalidade do pecado, a Santificação é um processo contínuo que dura a vida inteira, visando nos livrar do poder do pecado. É uma obra cooperativa (sinergística): o Espírito capacita, e o crente luta ativamente, mortifica os desejos carnais e desenvolve a semelhança com Cristo.\n\nO fim definitivo de todo crente é a Glorificação. Na volta de Cristo, o crente será finalmente livre da própria presença do pecado, recebendo um corpo ressurreto, imortal e incorruptível, perfeitamente adaptado para a eternidade na presença física do Senhor.',
        versiculos: ['Fp 2:12-13', 'Rm 8:13', 'Hb 12:14', '1Ts 5:23', 'Rm 8:30', '1Co 15:51-54']
      }
    ]
  },
  {
    id: 'eclesiologia',
    nome: 'Eclesiologia',
    descricao: 'O estudo da Igreja de Cristo — sua natureza misteriosa, governo bíblico, ordenanças, e sua missão urgente neste mundo.',
    icon: '⛪',
    color: 'from-teal-500 to-cyan-600',
    topicos: [
      {
        titulo: 'A Igreja Universal e Local',
        conteudo: 'A palavra ekklesia significa "chamados para fora". A Igreja Universal (invisível) compreende todos os verdadeiros crentes regenerados, de todas as eras, línguas e nações, que estão unidos misticamente ao Cristo glorificado, que é a Cabeça do Corpo.\n\nA Igreja Local (visível) é a manifestação terrena deste Corpo espiritual: uma congregação organizada de crentes professos que se reúnem regularmente para a pregação fiel da Palavra, administração correta das ordenanças, adoração corporativa e exercício da disciplina eclesiástica mútua.',
        versiculos: ['Mt 16:18', 'Ef 1:22-23', 'Ef 5:25-27', '1Co 12:12-13', 'At 2:42-47', 'Hb 10:24-25']
      },
      {
        titulo: 'Oficiais e Disciplina',
        conteudo: 'O Novo Testamento apresenta dois ofícios permanentes para a liderança da igreja local: Presbíteros (também chamados de pastores ou bispos), que são responsáveis pelo ensino, proteção e pastoreio espiritual do rebanho; e Diáconos, que gerenciam as necessidades práticas, financeiras e logísticas, aliviando os presbíteros para a oração e o ministério da Palavra.\n\nA disciplina eclesiástica, instruída por Cristo (Mt 18), é a marca de uma igreja verdadeira, projetada não para destruir, mas para restaurar o crente que cai em pecado deliberado, proteger a pureza da noiva de Cristo e manter um testemunho santo perante o mundo.',
        versiculos: ['1Tm 3:1-13', 'Tt 1:5-9', '1Pe 5:1-4', 'Mt 18:15-17', '1Co 5:1-13']
      },
      {
        titulo: 'As Ordenanças Sagradas',
        conteudo: 'Os protestantes reconhecem duas ordenanças (sacramentos) instituídas diretamente por Cristo: O Batismo e a Ceia do Senhor. O Batismo nas águas é o rito de iniciação, uma declaração pública de identificação com a morte, sepultamento e ressurreição de Cristo, marcando o perdão dos pecados.\n\nA Ceia do Senhor (Comunhão) é o rito contínuo de nutrição espiritual e memória. Através do pão e do vinho, a igreja recorda vividamente o corpo partido e o sangue derramado no Calvário, experimentando a comunhão espiritual real com o Cristo ressurreto, enquanto aguardam a Sua vinda.',
        versiculos: ['Mt 28:19-20', 'Rm 6:3-4', 'Cl 2:12', '1Co 11:23-26', 'Lc 22:19-20']
      }
    ]
  },
  {
    id: 'escatologia',
    nome: 'Escatologia',
    descricao: 'O fascinante estudo das Últimas Coisas — a morte, a parousia, a ressurreição final, os julgamentos divinos e a nova criação.',
    icon: '🌅',
    color: 'from-yellow-500 to-amber-600',
    topicos: [
      {
        titulo: 'A Esperança Bendita (Parousia)',
        conteudo: 'A doutrina escatológica mais central e inegociável é a Segunda Vinda corporal, visível, repentina e gloriosa de Jesus Cristo à terra (Parousia). Ele não virá em humilhação como um cordeiro para sofrer, mas em glória infinita como o Leão de Judá para julgar, fazer guerra contra o mal, salvar Seu povo definitivamente e estabelecer o Seu reino incontestável.\n\nEsta promessa, apelidada de "A Esperança Bendita", é a motivação máxima para a purificação da Igreja, a urgência missionária e a paciência em meio às perseguições globais contra o Cristianismo.',
        versiculos: ['At 1:11', 'Ap 1:7', 'Mt 24:30', '1Ts 4:16-17', 'Tt 2:13', 'Hb 9:28']
      },
      {
        titulo: 'As Visões Milenistas',
        conteudo: 'Existem três sistemas principais de interpretação do Milênio (os 1000 anos descritos em Ap 20): O Amilenismo (o milênio é simbólico e representa a era atual da Igreja, onde Cristo reina nos céus); O Pós-milenismo (o evangelho triunfará gradualmente na sociedade e Cristo voltará depois dessa era dourada); e o Pré-milenismo (Cristo voltará antes do milênio para instaurar um reino literal e físico de paz na terra por 1000 anos, centrado em Jerusalém).\n\nIndependentemente das divergências interpretativas, a ortodoxia exige a crença no triunfo final e retumbante de Deus sobre a história, a condenação irrevogável de Satanás, e o início da eternidade perfeita.',
        versiculos: ['Ap 20:1-6', 'Is 11:6-9', '2Pe 3:8', '1Co 15:24-25']
      },
      {
        titulo: 'O Estado Intermediário e Final',
        conteudo: 'Ao morrer, a alma humana entra no Estado Intermediário, sem jamais perder a consciência. Os crentes vão imediatamente para a presença do Senhor ("estar com Cristo, o que é incomparavelmente melhor"), aguardando a ressurreição dos corpos. Os ímpios vão para um estado consciente de espera sombria e tormento até o julgamento.\n\nA história culmina na Ressurreição Geral e no Juízo Final no Grande Trono Branco. Os cujos nomes não estão no Livro da Vida experimentarão a Segunda Morte (separação total de Deus no lago de fogo). Os salvos herdarão os Novos Céus e a Nova Terra, onde Deus fará Sua morada eterna com o homem, erradicando para sempre a dor, as lágrimas e a morte.',
        versiculos: ['2Co 5:8', 'Lc 16:19-31', 'Jo 5:28-29', 'Ap 20:11-15', 'Ap 21:1-4']
      }
    ]
  },
  {
    id: 'angelologia',
    nome: 'Angelologia (e Demonologia)',
    descricao: 'O estudo da ordem criatural invisível — anjos bons (seus ministérios) e a realidade obscura de Satanás e seus demônios caídos.',
    icon: '👼',
    color: 'from-blue-400 to-indigo-500',
    topicos: [
      {
        titulo: 'A Criação e Ministério dos Anjos',
        conteudo: 'Os anjos são seres espirituais finitos, pessoais e imortais, criados por Cristo (o Verbo) para exaltarem a Deus e servirem aos Seus propósitos cósmicos. Eles não são seres humanos glorificados pós-morte, mas uma classe inteiramente diferente de criaturas celestiais, muitas vezes organizadas em hierarquias complexas (arcanjos, querubins, serafins e principados).\n\nSeu ministério inclui adorar a Deus incessantemente, mediar mensagens divinas (no passado bíblico), executar os julgamentos do Senhor contra as nações, e atuar silenciosamente como "espíritos ministradores, enviados para servir àqueles que hão de herdar a salvação", protegendo os crentes de perigos ocultos.',
        versiculos: ['Cl 1:16', 'Sl 148:2-5', 'Hb 1:14', 'Mt 18:10', 'Ap 5:11', 'Is 6:1-3']
      },
      {
        titulo: 'A Queda de Satanás e Seus Agentes',
        conteudo: 'A Bíblia revela que Lúcifer (Satanás), originalmente um anjo guardião exaltado em extrema beleza, pecou por soberba, desejando igualar-se a Deus. Em sua rebelião primeva, ele arrastou consigo uma terça parte da hoste angélica, que agora são conhecidos como demônios ou espíritos imundos.\n\nSatanás, como um "leão que ruge", lidera um reino organizado de trevas, atuando como o acusador dos irmãos, o grande enganador das nações e o tentador das almas. Contudo, ele é um ser derrotado. A Cruz despojou os principados e potestades, e o lago de fogo já está preparado como destino final inalterável para o Diabo e seus anjos.',
        versiculos: ['Is 14:12-15', 'Ez 28:12-17', 'Jo 8:44', 'Ef 6:11-12', 'Cl 2:15', 'Ap 20:10']
      }
    ]
  },
  {
    id: 'apologetica',
    nome: 'Apologética',
    descricao: 'A defesa racional e vigorosa da fé cristã — respondendo a objeções céticas e demonstrando a veracidade absoluta do Evangelho.',
    icon: '🛡️',
    color: 'from-slate-500 to-gray-700',
    topicos: [
      {
        titulo: 'O Mandato Apologético e a Razão',
        conteudo: 'A fé cristã não é um salto cego no escuro (fideísmo); é uma confiança fundamentada em fatos objetivos. A Apologética não é uma disciplina opcional, mas um mandamento bíblico rigoroso. O apóstolo Pedro nos ordena a estarmos "sempre preparados para responder (dar apologia) a todo aquele que pedir a razão da esperança", e Paulo fala em "destruir fortalezas" e falsos argumentos intelectuais.\n\nO objetivo final da apologética não é "ganhar debates" ou massagear o ego intelectual, mas remover obstáculos cognitivos que impedem o não-crente de levar o evangelho a sério, prestando um testemunho lúcido que aponte o coração do perdido de volta à suficiência de Cristo.',
        versiculos: ['1Pe 3:15', 'Jd 3', '2Co 10:4-5', 'Fp 1:16', 'At 17:16-34']
      },
      {
        titulo: 'A Defesa da Ressurreição Histórica',
        conteudo: 'A pedra angular de todo o edifício apologético cristão repousa na historicidade inegável da ressurreição corpórea de Jesus de Nazaré. Se a ressurreição for falsa, "nossa pregação é inútil", como Paulo declarou. A defesa cristã concentra-se em fatos históricos aceitos por críticos críticos: a tumba vazia, as múltiplas aparições post-mortem a céticos e grupos grandes, e a mudança radical dos apóstolos covardes para mártires inabaláveis.\n\nNenhuma teoria alternativa (teoria do roubo do corpo, desmaio na cruz, alucinação em massa) consegue explicar todos esses fatos simultaneamente tão bem quanto a conclusão milagrosa e literal: Ele realmente ressuscitou e interveio na história humana.',
        versiculos: ['1Co 15:3-8', '1Co 15:14-17', 'At 2:32', 'At 4:33', 'Lc 24:39']
      }
    ]
  },
  {
    id: 'missiologia',
    nome: 'Missiologia',
    descricao: 'A ciência teológica da Missão de Deus e da Igreja no mundo — o impulso do evangelismo, plantação de igrejas e cruzamento de barreiras culturais.',
    icon: '🌍',
    color: 'from-emerald-500 to-teal-700',
    topicos: [
      {
        titulo: 'A Metanarrativa Missionária (Missio Dei)',
        conteudo: 'A missiologia baseia-se no conceito da Missio Dei (A Missão de Deus). A missão não é apenas um departamento na igreja ou um programa ocasional; a missão é o propósito da própria existência da Igreja, impulsionado por um Deus intrinsecamente missionário.\n\nDesde a expulsão do Éden, passando pelo chamado de Abraão (para que nele todas as famílias da terra fossem benditas), até as visões escatológicas do Apocalipse mostrando redimidos de toda tribo, língua e nação, a Bíblia é o diário da busca obstinada do Criador pela reconciliação da criação caída.',
        versiculos: ['Gn 12:1-3', 'Is 49:6', 'Jo 20:21', 'Ap 5:9', 'Ap 7:9']
      },
      {
        titulo: 'O Escopo da Grande Comissão',
        conteudo: 'A ordem final de Cristo não foi apenas para fazer convertidos rasos, mas "fazer discípulos", não apenas onde é confortável, mas de "todas as nações" (os ethne - grupos etnolinguísticos do mundo). Isso exige intencionalidade transcultural, cruzando fronteiras geográficas, linguísticas e sociais para levar a luz ao local mais escuro.\n\nMissões envolvem a proclamação verbal clara do Evangelho para arrependimento, o batismo dos novos convertidos, o ensino de todo o conselho de Deus e a plantação e estabelecimento de igrejas autônomas, maduras e reprodutivas nas culturas nativas, para que a missão continue.',
        versiculos: ['Mt 28:18-20', 'Mc 16:15', 'Lc 24:46-48', 'At 1:8', 'Rm 10:14-15']
      }
    ]
  },
  {
    id: 'etica-crista',
    nome: 'Ética Cristã',
    descricao: 'O estudo da conduta moral divina — aplicando o padrão imutável de Deus aos dilemas éticos profundos da sociedade.',
    icon: '⚖️',
    color: 'from-amber-400 to-yellow-600',
    topicos: [
      {
        titulo: 'A Fonte Absoluta da Moralidade',
        conteudo: 'A teologia secular baseia a ética em contrato social, relativismo cultural ou utilitarismo (o que for melhor para a maioria). A Ética Cristã, entretanto, repousa em bases transcendentais absolutas: O próprio caráter essencial de Deus. Deus não está sujeito a um padrão moral superior; Seu ser santo é o padrão.\n\nO que Deus aprova nas Escrituras é moralmente bom (porque reflete quem Ele é); o que Deus proíbe é o mal objetivo (porque se opõe ao Seu caráter). Por isso, a revelação bíblica, resumida nos Dez Mandamentos e destilada na Lei do Amor, é a grade de avaliação infalível para qualquer comportamento ou dilema moderno.',
        versiculos: ['Lv 19:2', '1Pe 1:15-16', 'Ex 20:1-17', 'Mt 5:48', 'Sl 119:137-138']
      },
      {
        titulo: 'A Prática Transformativa do Reino',
        conteudo: 'Na era do Novo Testamento, a Ética Cristã não é um mero moralismo rígido, mas as "boas obras que Deus preparou de antemão" fluindo da regeneração interior do crente. Jesus expôs no Sermão do Monte (Mt 5-7) a ética radical do Reino de Deus: vai além das aparências externas e perfura a raiz do coração (orgulho, luxúria, raiva).\n\nGuiada pelo Espírito Santo e pelo amor (Agape), a Ética Cristã lida corajosamente com pautas vitais: a santidade do casamento e da família, a administração do corpo (pureza sexual e abstinência de vícios), a ética no trabalho, a defesa da santidade e o valor inegociável da vida humana desde a concepção, e o uso de recursos para o alívio dos pobres.',
        versiculos: ['Mt 5:21-28', 'Rm 12:1-2', '1Co 6:19-20', 'Ef 5:1-5', 'Tg 1:27']
      }
    ]
  },
  {
    id: 'patristica',
    nome: 'Patrística',
    descricao: 'O estudo formidável da teologia e dos escritos dos Pais da Igreja durante os primeiros séculos do Cristianismo.',
    icon: '📜',
    color: 'from-stone-500 to-amber-700',
    topicos: [
      {
        titulo: 'O Elo com os Apóstolos',
        conteudo: 'A Patrística é vital porque fornece a ponte histórica e teológica imediata entre a era apostólica (o Novo Testamento) e o subsequente desenvolvimento dogmático da Igreja. Os chamados "Pais Apostólicos" (como Inácio de Antioquia, Clemente de Roma e Policarpo) conviveram ou foram discipulados diretamente por apóstolos como João e Pedro.\n\nEstudar seus escritos, como a Didaquê e a Carta a Diogneto, revela como a Igreja Primitiva compreendia o evangelho de maneira orgânica antes dos grandes concílios. Eles testemunham a adoração dominical precoce, o alto apreço pela liderança presbiteral e, acima de tudo, uma disposição inabalável ao martírio, confessando "Curios Iesous" (Jesus é Senhor) diante do Império Romano.',
        versiculos: ['Jd 3', '2Tm 2:2', 'Hb 13:7', 'Fp 1:21']
      },
      {
        titulo: 'A Forja da Ortodoxia',
        conteudo: 'À medida que o Cristianismo se expandiu intelectualmente, enfrentou formidáveis ameaças internas (heresias gnósticas, marcionitas e arianas). Os Pais Apologistas (como Justino Mártir, Ireneu de Lyon e Tertuliano) começaram a usar ferramentas filosóficas para defender a pureza da fé apostólica.\n\nA era de ouro da Patrística culminou nos grandes Concílios Ecumênicos. Pais como Atanásio lutaram incansavelmente em Niceia (325 d.C.) para afirmar o homoousios (o Filho é da mesma substância do Pai). Posteriormente, Capadócios e figuras como Agostinho de Hipona desenvolveram a linguagem técnica que usamos até hoje para falar sobre a graça soberana de Deus, o Pecado Original e o mistério inefável da Trindade.',
        versiculos: ['1Tm 3:16', '1Jo 4:1-3', 'Tt 1:9', '2Pe 2:1']
      }
    ]
  },
  {
    id: 'historia-igreja',
    nome: 'História da Igreja',
    descricao: 'O relato fascinante da Providência de Deus através dos séculos, preservando Sua Noiva em meio a crises, glórias e reformas.',
    icon: '🏛️',
    color: 'from-red-700 to-rose-900',
    topicos: [
      {
        titulo: 'A Reforma Protestante e os Solas',
        conteudo: 'Após séculos de crescente declínio moral no clero, tradições obscurecendo as Escrituras e um sistema sacramental de obras e indulgências, o século XVI testemunhou a explosão da Reforma Protestante. Deus levantou homens como Martinho Lutero (Alemanha) e João Calvino (Suíça) para ancorar a Igreja novamente na rocha da revelação bíblica.\n\nO brado da Reforma foi cristalizado nas cinco "Solas": A Bíblia é a única autoridade infalível (Sola Scriptura), a salvação é unicamente pela obra de Deus (Sola Gratia), recebida apenas pela fé sem méritos humanos (Sola Fide), baseada no sacrifício exclusivo e suficiente de Cristo (Solus Christus), resultando em que toda a glória pertença somente a Deus (Soli Deo Gloria).',
        versiculos: ['Rm 1:17', 'Ef 2:8-9', 'Sl 119:105', 'Gl 1:8-9']
      },
      {
        titulo: 'O Fogo dos Grandes Avivamentos',
        conteudo: 'A história da Igreja prova que quando a doutrina se torna meramente acadêmica ou fria, o Espírito Santo intervém. O Primeiro e Segundo Grandes Despertamentos (séculos 18 e 19) nos Estados Unidos e na Europa incendiaram o mundo. Homens como Jonathan Edwards, George Whitefield, John Wesley e Charles Spurgeon proclamaram o evangelho com unção incomum, levando multidões ao arrependimento profundo.\n\nEsses avivamentos não causaram apenas choro temporário; eles reformaram sociedades inteiras, aboliram a escravidão (através de evangélicos como William Wilberforce), fundaram orfanatos (George Müller) e dispararam a era moderna de missões transculturais, provando o poder regenerador e invencível do Evangelho ao longo da história.',
        versiculos: ['At 3:19', 'Sl 85:6', 'Hc 3:2', 'At 4:31']
      }
    ]
  },
  {
    id: 'teologia-biblica',
    nome: 'Teologia Bíblica',
    descricao: 'O estudo da revelação orgânica e progressiva de Deus — mapeando as metanarrativas de Criação, Queda e Redenção de Gênesis a Apocalipse.',
    icon: '📚',
    color: 'from-blue-600 to-indigo-800',
    topicos: [
      {
        titulo: 'O Fio Escarlate da Redenção',
        conteudo: 'Ao contrário da Teologia Sistemática, que organiza o ensino bíblico topograficamente por temas lógicos (ex: "O que a Bíblia diz sobre anjos?"), a Teologia Bíblica examina os temas redentivos de forma histórica, cronológica e progressiva. Ela traça os grandes padrões temáticos (Templo, Sacerdócio, Sacrifício, Rei, Sábado) conforme florescem de promessas obscuras no Gênesis até cumprirem-se gloriosamente em Cristo.\n\nA Teologia Bíblica nos ensina a ler a Bíblia cristocentricamente. Ela previne que moralizemos narrativas do Antigo Testamento (ex: "Seja valente como Davi"), forçando-nos a ver que o texto sempre aponta para Cristo (Ele é o verdadeiro Rei que mata o gigante do pecado e da morte em nosso lugar).',
        versiculos: ['Lc 24:27', 'Jo 5:39', 'Hb 1:1-2', '1Pe 1:10-12']
      },
      {
        titulo: 'A Arquitetura das Alianças (Pactos)',
        conteudo: 'A espinha dorsal que mantém toda a narrativa bíblica unida é o desenrolar das Alianças (Pactos) divinos. Deus sempre lidou com a humanidade em termos pactuais. A Aliança da Obras com Adão (falhou pela Queda). A Aliança da Graça manifesta-se através das alianças com Noé (preservação do mundo), Abraão (a promessa da descendência e bênção global), Moisés (a lei e o sistema sacrifical como aio), e Davi (a promessa de um Rei eterno).\n\nTudo isso atinge o clímax absoluto na Nova Aliança, inaugurada no sangue de Cristo. Esta aliança superior e inquebrável não está escrita em tábuas de pedra, mas gravada pelo Espírito em corações de carne, garantindo o perdão definitivo dos pecados e a comunhão eterna com o Rei.',
        versiculos: ['Jr 31:31-34', 'Lc 22:20', 'Hb 8:6-13', 'Gl 3:24-25']
      }
    ]
  },
  {
    id: 'aconselhamento-pastoral',
    nome: 'Aconselhamento Bíblico',
    descricao: 'A ciência teológica de aplicar as profundas verdades da Palavra de Deus aos recônditos da alma humana para curar o sofrimento e confrontar o pecado.',
    icon: '🤝',
    color: 'from-green-600 to-emerald-800',
    topicos: [
      {
        titulo: 'A Suficiência Radical da Palavra',
        conteudo: 'O fundamento de todo aconselhamento verdadeiramente cristão reside na premissa da total e plena suficiência das Escrituras. A Bíblia não é um compêndio obsoleto, mas o manual definitivo do Criador para a alma humana. Embora reconheçamos problemas orgânicos e médicos que requerem atenção clínica, os dilemas e ansiedades fundamentais não-médicas da alma humana enraízam-se no pecado, ídolos do coração ou no profundo sofrimento num mundo caído.\n\nO aconselhamento bíblico (noutético) repudia a ideia de que a Bíblia precise ser amalgamada com pressuposições da psicologia humanista secular (que vê o homem como essencialmente bom e o pecado como mera disfunção ambiental). Ao contrário, oferece Cristo como a única terapia duradoura e o evangelho como a lente pela qual todo o trauma humano ganha significado redentor.',
        versiculos: ['2Tm 3:16-17', '2Pe 1:3', 'Sl 19:7-9', 'Hb 4:12', 'Sl 119:24']
      },
      {
        titulo: 'O Diagnóstico: Ídolos do Coração',
        conteudo: 'Na visão bíblica, o comportamento humano sempre flui do "coração" (o centro de controle da vontade, afeições e intelecto). Os problemas de comportamento crônicos (explosões de ira, imoralidade, vícios, depressão não-clínica) raramente são o problema principal; eles são sintomas de uma raiz mais profunda: adoração equivocada.\n\nO conselheiro bíblico ajuda o aconselhado a investigar as camadas superficiais e expor os "ídolos do coração" (falsos deuses) - coisas boas (aprovação humana, conforto, sucesso, controle) que foram elevadas ao status de divindades, e pelas quais a pessoa estaria disposta a pecar para obter. A cura não vem pelo esforço moral, mas pelo arrependimento e por colocar Cristo de volta no trono exclusivo dos afetos.',
        versiculos: ['Pv 4:23', 'Ez 14:3', 'Jr 2:13', 'Mt 12:34', 'Tg 1:14-15']
      }
    ]
  },
  {
    id: 'heresiologia',
    nome: 'Heresiologia e Seitas',
    descricao: 'O estudo cirúrgico dos erros doutrinários fatais, visando proteger a pureza dogmática e resgatar ovelhas dos enganos espirituais.',
    icon: '🐍',
    color: 'from-zinc-600 to-neutral-800',
    topicos: [
      {
        titulo: 'A Anatomia da Heresia',
        conteudo: 'A heresia não é uma mera divergência de opinião sobre questões periféricas (como o tipo de música do culto ou detalhes do milênio). Uma verdadeira heresia teológica corrompe o cerne do evangelho, comprometendo doutrinas inegociáveis, que se mantidas, impossibilitam a salvação (ex: a divindade de Cristo, a Trindade, ou a justificação somente pela fé).\n\nHistoricamente, as seitas usam três táticas primárias contra a Ortodoxia Bíblica: Adicionam à Bíblia (afirmando ter novas revelações superiores à Escritura); Subtraem de Cristo (reduzindo-O a um mestre iluminado, um anjo exaltado ou um profeta); e Multiplicam os requisitos de salvação (exigindo que o sacrifício de Cristo seja suplementado por boas obras e obediência cega à liderança sectária).',
        versiculos: ['2Pe 2:1', 'Gl 1:8-9', '1Jo 4:1-3', '2Jo 1:9-10', 'Tt 3:10']
      },
      {
        titulo: 'O Dever da Polemica Cristã',
        conteudo: 'O Novo Testamento tem um tom intensamente protetor (polemista) contra falsos mestres. Jesus os descreveu como "lobos devoradores" disfarçados em peles de ovelhas. Paulo instruiu os presbíteros de Éfeso a vigiarem ferozmente o rebanho contra esses saqueadores teológicos.\n\nEstudar Heresiologia não é um exercício de arrogância intelectual ou falta de amor, mas a manifestação suprema de amor pelas almas imortais. Não podemos tolerar mentiras sobre a identidade de Deus e sobre o caminho da salvação. Conhecer a mentira habilita o apologeta e pastor a expor o engano e puxar as ovelhas de volta ao abrigo do verdadeiro Pastor.',
        versiculos: ['Mt 7:15', 'At 20:29-30', 'Tt 1:9', 'Jd 22-23', '2Tm 4:3-4']
      }
    ]
  },
  {
    id: 'hermeneutica',
    nome: 'Hermenêutica',
    descricao: 'A ciência exata e a arte teológica da interpretação bíblica — extraindo o significado autêntico, original e divino dos textos sagrados.',
    icon: '🔍',
    color: 'from-orange-500 to-red-500',
    topicos: [
      {
        titulo: 'O Abismo e as Pontes',
        conteudo: 'O principal desafio ao abrir a Bíblia é que existe um triplo abismo entre o leitor contemporâneo e os autores bíblicos originais: um abismo Histórico (séculos de distância temporal), um abismo Cultural (costumes do antigo Oriente e mundo Greco-Romano) e um abismo Linguístico (textos em Hebraico, Aramaico e Grego Koiné).\n\nA Hermenêutica constrói as pontes intelectuais rigorosas para superar esses abismos. O método predominante endossado pela teologia evangélica conservadora é o Método Histórico-Gramatical. Ele insiste que o sentido verdadeiro do texto é o seu sentido normal, natural, considerando o uso gramatical exato das palavras na época e as circunstâncias históricas em que o autor operava, rejeitando misticismos ou alegorizações fantasiosas.',
        versiculos: ['2Tm 2:15', 'Ne 8:8', 'Lc 24:27', '2Pe 3:15-16']
      },
      {
        titulo: 'A Intenção do Autor',
        conteudo: 'O axioma central da hermenêutica cristã é que a Bíblia tem apenas um sentido primordial: o sentido pretendido pelo Autor divino e pelo autor humano inspirado. O leitor moderno não "cria" o significado lendo o texto com suas emoções ("O que este versículo significa para mim?"). O texto já possui significado inerente e objetivo ("O que o autor bíblico quis dizer aos seus ouvintes originais?").\n\nEste processo de extrair e escavar a intenção original é chamado de Exegese. O processo malicioso de injetar ideias pessoais num texto bíblico, distorcendo-o para apoiar uma tese própria, é chamado Eisegese (a mãe de todas as heresias e maus sermões).',
        versiculos: ['At 17:11', '1Co 2:13', 'Pv 30:5-6']
      }
    ]
  },
  {
    id: 'homiletica',
    nome: 'Homilética',
    descricao: 'A majestosa arte e ciência da pregação cristã sagrada — o processo de forjar, organizar e proclamar expositivamente o conselho de Deus.',
    icon: '🎤',
    color: 'from-pink-500 to-rose-600',
    topicos: [
      {
        titulo: 'A Pregação Expositiva',
        conteudo: 'Historicamente, os grandes arautos de Deus defenderam que o púlpito não é lugar para palestras de autoajuda espiritualizadas, mas para o "trovejar" profético das verdades da Escritura. O auge da homilética repousa na Pregação Expositiva. Neste estilo, a proposição central do sermão é rigorosamente derivada e ditada pelo próprio texto bíblico e seu contexto imediato.\n\nEnquanto sermões temáticos usam a Bíblia como um trampolim para o que o pregador quer falar, o sermão expositivo se submete ao texto. O pregador age como um despenseiro fiel ou carteiro: sua única missão majestosa e solene é desenrolar o pergaminho, rasgar o texto aos olhos do povo, extrair seu significado inerrante e aplicá-lo cirurgicamente e compassivamente aos corações dos ouvintes.',
        versiculos: ['2Tm 4:1-2', 'Rm 10:14-17', 'Ne 8:8', '1Co 2:1-4']
      },
      {
        titulo: 'A Anatomia do Sermão',
        conteudo: 'A ciência homilética providencia o esqueleto estrutural para sustentar a carne teológica e dar força persuasiva à pregação. Um sermão robusto exige uma Arquitetura lógica: Uma Introdução arrebatadora que agarra o interesse e introduz o conflito humano; o Corpo central dividido em tópicos lógicos e unificados em torno de uma Big Idea (A Grande Proposição).\n\nMas não é apenas teologia abstrata. A força do sermão repousa na Ilustração (janelas que trazem luz às ideias abstratas usando cenas concretas) e fundamentalmente na Aplicação (o processo de desafiar a congregação à mudança). O bom sermão nunca deve deixar a igreja apenas mais inteligente; deve deixá-la mais contrita, mais enamorada de Cristo e moralmente impelida a transformar o mundo.',
        versiculos: ['At 2:14-36', 'At 17:22-31', 'Cl 1:28', 'Mt 7:28-29']
      }
    ]
  }
]
