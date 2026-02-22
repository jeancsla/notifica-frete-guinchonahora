import type { GetServerSideProps, NextPage } from "next";
import Link from "next/link";
import type { SessionUser } from "@notifica/shared/types";
import Layout from "../components/Layout";
import { getSession } from "lib/session";

type PageProps = {
  user: SessionUser;
};

export const getServerSideProps: GetServerSideProps<PageProps> = async ({
  req,
}) => {
  const session = await getSession(req as { headers?: { cookie?: string } });
  const user = session.user || null;

  if (!user) {
    return {
      redirect: {
        destination: "/login",
        permanent: false,
      },
    };
  }

  return {
    props: { user },
  };
};

const Overview: NextPage<PageProps> = () => {
  return (
    <Layout
      title="Controle de Operações"
      subtitle="Monitoramento centralizado de fretes, cargas e disponibilidade."
      actions={
        <>
          <Link className="button secondary" href="/dashboard">
            Abrir dashboard
          </Link>
          <Link className="button" href="/table">
            Ver tabela
          </Link>
        </>
      }
    >
      <section className="grid cols-3">
        <div className="card">
          <h3>Visao Geral</h3>
          <p className="muted">
            Consolide cargas, status da integracao e fila de notificacoes em
            tempo real. Todo o fluxo vem da API.
          </p>
        </div>
        <div className="card">
          <h3>Prioridades</h3>
          <p className="muted">
            Destaque cargas criticas, previsao de coleta e rotas de maior
            urgencia.
          </p>
        </div>
        <div className="card">
          <h3>Atualizacao Manual</h3>
          <p className="muted">
            Botao de refresh em cada tela para trazer dados novos sem input
            manual.
          </p>
        </div>
      </section>
      <section style={{ marginTop: "24px" }} className="grid cols-2">
        <div className="card">
          <h3>Fluxo sugerido</h3>
          <div className="detail-list">
            <div className="detail-item">
              <span>1. Monitorar dashboard</span>
              <span className="badge">Live</span>
            </div>
            <div className="detail-item">
              <span>2. Inspecionar detalhes</span>
              <span className="badge">Detalhes</span>
            </div>
            <div className="detail-item">
              <span>3. Validar status backend</span>
              <span className="badge">Status</span>
            </div>
          </div>
        </div>
        <div className="card">
          <h3>Proximos passos</h3>
          <p className="muted">
            Ajuste filtros, marque prioridades no backend e acompanhe a
            performance das notificacoes.
          </p>
        </div>
      </section>
    </Layout>
  );
};

export default Overview;
