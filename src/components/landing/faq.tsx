import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const QUESTIONS = [
  {
    question: "What is EquityCairn?",
    answer:
      "A news feed built around the tickers you follow. It collects stories about those companies into one feed, groups duplicate coverage, and shows where each story came from.",
  },
  {
    question: "Who is it for?",
    answer:
      "Anyone who keeps a watchlist of companies and wants to follow their news without checking many sites.",
  },
  {
    question: "What does the beta cost, and what does it include?",
    answer:
      "Joining the waitlist costs nothing. The beta will focus on following tickers and the grouped feed. We'll tell you what's included, and about any pricing, before you start.",
  },
  {
    question: "Where does the news come from?",
    answer:
      "We're still finalising our sources. Whatever they are, every story will name its publisher and link to the original article.",
  },
  {
    question: "What happens to my email?",
    answer:
      "We only use your email to contact you about the beta, and we don't share it.",
  },
];

export function Faq() {
  return (
    <section aria-labelledby="faq" className="border-t bg-muted/40">
      <div className="mx-auto flex max-w-3xl flex-col gap-8 px-4 py-16 sm:px-6 md:py-24">
        <h2
          id="faq"
          className="text-2xl font-semibold tracking-tight md:text-3xl"
        >
          Questions
        </h2>
        <Accordion>
          {QUESTIONS.map(({ question, answer }) => (
            <AccordionItem key={question} value={question}>
              <AccordionTrigger>{question}</AccordionTrigger>
              <AccordionContent>
                <p className="text-muted-foreground">{answer}</p>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
