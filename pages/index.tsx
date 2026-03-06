import type { GetServerSideProps, NextPage } from "next";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  Table2,
  ArrowRight,
  CheckCircle2,
  Clock,
  TrendingUp,
} from "lucide-react";
import type { SessionUser } from "@notifica/shared/types";
import Layout from "../components/Layout";
import { getSession } from "lib/session";

// shadcn/ui components
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

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
  const features = [
    {
      icon: LayoutDashboard,
      title: "Visão Geral",
      description:
        "Consolide cargas, status da integração e fila de notificações em tempo real.",
      color: "text-orange-500",
      bgColor: "bg-orange-500/10",
    },
    {
      icon: TrendingUp,
      title: "Prioridades",
      description:
        "Destaque cargas críticas, previsão de coleta e rotas de maior urgência.",
      color: "text-red-500",
      bgColor: "bg-red-500/10",
    },
    {
      icon: Clock,
      title: "Atualização Manual",
      description:
        "Botão de atualização em cada tela para trazer dados novos sem input manual.",
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
  ];

  const suggestedFlow = [
    { step: 1, label: "Monitorar dashboard", badge: "Live" },
    { step: 2, label: "Inspecionar detalhes", badge: "Detalhes" },
    { step: 3, label: "Validar status backend", badge: "Status" },
  ];

  return (
    <Layout
      title="Controle de Operações"
      subtitle="Monitoramento centralizado de fretes, cargas e disponibilidade."
      actions={
        <div className="flex gap-3">
          <Link href="/dashboard">
            <Button variant="outline" className="gap-2">
              <LayoutDashboard className="h-4 w-4" />
              Abrir dashboard
            </Button>
          </Link>
          <Link href="/table">
            <Button className="gap-2">
              <Table2 className="h-4 w-4" />
              Ver tabela
            </Button>
          </Link>
        </div>
      }
    >
      <div className="grid gap-6 md:grid-cols-3">
        {features.map((feature, index) => (
          <motion.div
            key={feature.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="h-full border-border/50 hover:border-border transition-colors">
              <CardHeader className="flex flex-row items-center gap-3 pb-2">
                <div className={`p-2 rounded-lg ${feature.bgColor}`}>
                  <feature.icon className={`h-5 w-5 ${feature.color}`} />
                </div>
                <CardTitle className="text-lg font-semibold">
                  {feature.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2 mt-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="h-full border-border/50">
            <CardHeader>
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                Fluxo Sugerido
              </CardTitle>
              <CardDescription>
                Siga estes passos para uma operação eficiente
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {suggestedFlow.map((item) => (
                  <div
                    key={item.step}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-sm">
                        {item.step}
                      </div>
                      <span className="text-sm font-medium">{item.label}</span>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {item.badge}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="h-full border-border/50">
            <CardHeader>
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <ArrowRight className="h-5 w-5 text-orange-500" />
                Próximos Passos
              </CardTitle>
              <CardDescription>
                Ações recomendadas para otimização
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                <li className="flex items-start gap-3 text-sm">
                  <ArrowRight className="h-4 w-4 text-orange-500 mt-0.5 shrink-0" />
                  <span className="text-muted-foreground">
                    Ajuste filtros para encontrar cargas específicas rapidamente
                  </span>
                </li>
                <li className="flex items-start gap-3 text-sm">
                  <ArrowRight className="h-4 w-4 text-orange-500 mt-0.5 shrink-0" />
                  <span className="text-muted-foreground">
                    Marque prioridades no backend para melhor organização
                  </span>
                </li>
                <li className="flex items-start gap-3 text-sm">
                  <ArrowRight className="h-4 w-4 text-orange-500 mt-0.5 shrink-0" />
                  <span className="text-muted-foreground">
                    Acompanhe a performance das notificações WhatsApp
                  </span>
                </li>
                <li className="flex items-start gap-3 text-sm">
                  <ArrowRight className="h-4 w-4 text-orange-500 mt-0.5 shrink-0" />
                  <span className="text-muted-foreground">
                    Monitore o status da API Tegma/Mills regularmente
                  </span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </Layout>
  );
};

export default Overview;
