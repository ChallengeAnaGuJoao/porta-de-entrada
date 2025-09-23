export function Footer() {
  return (
    <footer className="bg-roxo-escuro pt-8 pb-4 px-2">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center md:items-start gap-8 md:gap-0 border-b border-azul-principal/30 pb-6">

        <div className="flex-1 flex flex-col items-center md:items-center px-4 ">
          <h3 className="text-quase-branco text-lg md:text-xl font-bold mb-4 border-b border-azul-principal/30 w-full text-center pb-2">Unidades</h3>
          <p className="text-quase-branco text-center text-base mb-2">
            Av. Paulista, 1106 - 7º andar<br />
            Bela Vista, São Paulo - SP<br />
            CEP: 01311-000
          </p>
          <p className="text-quase-branco text-center text-base">
            Av. Lins de Vasconcelos, 1264 - Aclimação<br />
            São Paulo - SP<br />
            CEP: 01538-001
          </p>
        </div>

        <div className="flex-1 flex flex-col items-center px-4">
          <h3 className="text-quase-branco text-lg md:text-xl font-bold mb-4 border-b border-azul-principal/30 w-full text-center pb-2">Contato</h3>
          <p className="text-quase-branco text-center text-base mb-2">
            Tel: (11) 3385-8010<br />
            E-mail: atendimento@fiap.com.br
          </p>
          <p className="text-quase-branco text-center text-base">
            Horário de atendimento:<br />
            Segunda a Sexta, das 8h às 18h
          </p>
        </div>

        <div className="flex-1 flex flex-col items-center px-4">
          <h3 className="text-quase-branco text-lg md:text-xl font-bold mb-4 border-b border-azul-principal/30 w-full text-center pb-2">Links úteis</h3>
          <p className="text-quase-branco text-center text-base mb-2"><a href="#" className="hover:text-amarelo-claro">Política de Privacidade</a></p>
          <p className="text-quase-branco text-center text-base mb-2"><a href="#" className="hover:text-amarelo-claro">Termos de Uso</a></p>
          <p className="text-quase-branco text-center text-base"><a href="#" className="hover:text-amarelo-claro">Fale Conosco</a></p>
        </div>
      </div>

      <div className="text-center mt-4">
        <p className="text-quase-branco text-base">&copy; Feito por alunos da FIAP – Todos os direitos reservados</p>
      </div>

      <button
        id="voltarAoTopo"
        aria-label="Voltar ao topo"
        className="fixed bottom-4 right-4 bg-transparent text-azul-principal hover:text-quase-branco transition-colors"
      >
        <i className=""></i>
      </button>
    </footer>
  );
}
