import { Reveal } from "./ui/Reveal";
import { INSTAGRAM, WHATSAPP_URL } from "../../lib/config";

export function Footer() {
  return (
    <footer className="px-6 pt-12 pb-8 md:px-12">
      <Reveal className="m-0 block text-center text-[14px] leading-[1.4]">
        DEUS seja louvado!
      </Reveal>
      <div className="mt-10 flex flex-wrap items-center justify-between gap-6 text-body">
        <div className="flex gap-6">
          <a
            href={INSTAGRAM}
            target="_blank"
            rel="noreferrer"
            className="hover:opacity-70"
          >
            Instagram
          </a>
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noreferrer"
            className="hover:opacity-70"
          >
            Whatsapp
          </a>
        </div>
        <a href="mailto:contato@dibie.com.br" className="hover:opacity-70">
          contato@dibie.com.br
        </a>
      </div>
    </footer>
  );
}
