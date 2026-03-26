import React, { useState } from 'react';

interface FAQItem {
  question: string;
  answer: string | string[];
}

const FAQ: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const faqs: FAQItem[] = [
    {
      question: "What is the Bracket of Death?",
      answer: [
        "The short answer is, the BOD is an entire tennis tournament compressed into one day, and is the largest \"endurance tennis\" tournament in Kansas City. Matter of fact, it's probably the largest Endurance Tennis tournament in the world. Actually, I'm pretty sure it is the largest Endurance Tennis tournament in the world.",
        "The BOD is the largest Endurance Tennis Tournament in the world!",
        "Endurance tennis means the more you win, the more you play. The more you play, the more fatigued you become. The more fatigued you become, the harder it is to win.",
        "The BOD exists because tennis is awesome. And because tennis is awesome, *more* tennis is even *more* awesome. And if you carry this train of thought through to its logical extreme, you will arrive at the rationale of the BOD: It's all the tennis you can stand in one day, until only one team remains standing."
      ]
    },
    {
      question: "What sort of tournament is it?",
      answer: "A tennis tournament. (Doubles format)"
    },
    {
      question: "Can I pick my own partner?",
      answer: "No. Your partner will be determined by a lottery-style drawing process. We put some names in one hat, put some other names in another hat, and then randomly draw names from each hat to form teams. It's a little more scientific than that (to make sure the teams are all relatively competitive), but that's the general idea."
    },
    {
      question: "But I always play with my girlfriend/boyfriend/wife/husband/significant other, can't I play with them?",
      answer: "No."
    },
    {
      question: "So what's with the name? Has anybody actually died at the BOD?",
      answer: "*At* the BOD? No, not yet."
    },
    {
      question: "So what happens if it rains?",
      answer: [
        "Have you registered yet? No? Then don't worry about it.",
        "But if you DO register and it rains: We don't do refunds, so don't worry about it. You get a T-shirt!",
        "The only way to answer the \"What happens if it rains?\" question is to say, \"It depends.\" How much does it rain? How long does it rain? What time does the rain start? What time does it end? We've actually played an *entire tournament* in the rain, though the PTC probably won't let us do that for liability reasons.",
        "Worst-case scenario: it rains and we can't finish. Period. That could happen. This is the Tao of the Bracket of Death."
      ]
    },
    {
      question: "How much tennis is it?",
      answer: "A lot. The first round is a round robin, and since every team advances to the Round of 16, there's a 4-match guarantee. Each match consists of 11-game pro sets, so you're going to end up playing (on average) about 80 games worth of tennis (equivalent to about 7-8 sets) no matter what. You're going to get your money's worth."
    },
    {
      question: "Wow, that sounds like an awful lot of tennis!",
      answer: "Correct. It's the Bracket of *Death*."
    },
    {
      question: "Right, but still, isn't that like, ya' know…too much tennis?",
      answer: "Bracket. Of. Death. Not Bracket of Kittens, or Bracket of Pretty Flowers, or Bracket of Wine & Chocolate; Bee OH Dee!"
    },
    {
      question: "This whole thing sounds kinda stupid.",
      answer: "Your FACE sounds kinda stupid."
    },
    {
      question: "What do we get if we win?",
      answer: "A trophy, a T-shirt, and eternal bragging rights."
    },
    {
      question: "What does 2nd place get?",
      answer: "A medal, a T-shirt, and the pain of knowing they played all that tennis just to come in 2nd place."
    },
    {
      question: "What does last place get?",
      answer: "A T-shirt"
    },
    {
      question: "What if my partner doesn't show up?",
      answer: [
        "Have you registered yet? No? Then don't worry about it.",
        "Play shall continue with or without you. Because…",
        "Bracket. Of. Death."
      ]
    }
  ];

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  const renderAnswer = (answer: string | string[]) => {
    if (Array.isArray(answer)) {
      return answer.map((paragraph, idx) => (
        <p key={idx} className="text-gray-300 mb-2">
          {paragraph}
        </p>
      ));
    }
    return <p className="text-gray-300">{answer}</p>;
  };

  return (
    <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
      <h1 className="text-4xl font-bold text-white mb-6">Frequently Asked Questions</h1>
      
      <div className="space-y-4">
        {faqs.map((faq, index) => (
          <div
            key={index}
            className="bg-surface-dark border border-gray-700 rounded-lg overflow-hidden"
          >
            <button
              onClick={() => toggleFAQ(index)}
              className="w-full text-left px-6 py-4 flex items-center justify-between hover:bg-surface-dark-lighter transition-colors"
            >
              <h3 className="text-lg font-semibold text-white pr-8">
                {faq.question}
              </h3>
              <span className="text-tennis-green text-2xl flex-shrink-0">
                {openIndex === index ? '−' : '+'}
              </span>
            </button>
            
            {openIndex === index && (
              <div className="px-6 py-4 border-t border-gray-700 bg-background-dark/50">
                {renderAnswer(faq.answer)}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-12 p-6 bg-tennis-green/10 border-2 border-tennis-green rounded-lg">
        <p className="text-lg text-white font-semibold mb-2">
          No more questions.
        </p>
        <p className="text-gray-300">
          Register first, ask questions later.
        </p>
      </div>
    </div>
  );
};

export default FAQ;
