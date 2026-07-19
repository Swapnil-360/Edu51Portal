"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface CardItem {
  id: string | number;
  title: string;
  description: string;
  imgSrc: string;
  icon: React.ReactNode;
  linkHref: string;
  /** Optional small meta line rendered between the title and description (e.g. an ID). */
  meta?: string;
}

interface ExpandingCardsProps extends React.HTMLAttributes<HTMLUListElement> {
  items: CardItem[];
  defaultActiveIndex?: number;
}

export const ExpandingCards = React.forwardRef<
  HTMLUListElement,
  ExpandingCardsProps
>(({ className, items, defaultActiveIndex = 0, ...props }, ref) => {
  const [activeIndex, setActiveIndex] = React.useState<number | null>(
    defaultActiveIndex,
  );

  const gridStyle = React.useMemo(() => {
    if (activeIndex === null) return {};
    const columns = items
      .map((_, index) => (index === activeIndex ? "5fr" : "1fr"))
      .join(" ");
    return { gridTemplateColumns: columns };
  }, [activeIndex, items.length]);

  const handleInteraction = (index: number) => {
    setActiveIndex(index);
  };

  return (
    <ul
      className={cn(
        "w-full max-w-6xl gap-1.5 sm:gap-2",
        "grid grid-flow-col",
        "h-[380px] sm:h-[460px] md:h-[500px]",
        "transition-[grid-template-columns] duration-500 ease-out",
        className,
      )}
      style={{
        ...gridStyle,
        gridTemplateRows: '1fr',
      }}
      ref={ref}
      {...props}
    >
      {items.map((item, index) => (
        <li
          key={item.id}
          className={cn(
            "group relative cursor-pointer overflow-hidden rounded-lg border bg-card text-card-foreground shadow-sm",
            "min-w-[44px] sm:min-w-[56px] md:min-w-[80px]",
            "min-h-0"
          )}
          onMouseEnter={() => handleInteraction(index)}
          onFocus={() => handleInteraction(index)}
          onClick={() => handleInteraction(index)}
          tabIndex={0}
          data-active={activeIndex === index}
        >
          <img
            src={item.imgSrc}
            alt={item.title}
            className="absolute inset-0 h-full w-full object-cover transition-all duration-300 ease-out group-data-[active=true]:scale-100 group-data-[active=true]:grayscale-0 scale-110 grayscale"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

          <article
            className="absolute inset-0 flex flex-col justify-end gap-2 p-4"
          >
            <h3 className="origin-left rotate-90 whitespace-nowrap text-[10px] sm:text-sm font-light uppercase tracking-wider text-white/80 opacity-100 transition-all duration-300 ease-out group-data-[active=true]:opacity-0">
              {item.title}
            </h3>

            <div className="text-white/90 opacity-0 transition-all duration-300 delay-75 ease-out group-data-[active=true]:opacity-100">
              {item.icon}
            </div>

            <h3 className="text-xl font-bold text-white opacity-0 transition-all duration-300 delay-150 ease-out group-data-[active=true]:opacity-100">
              {item.title}
            </h3>

            {item.meta && (
              <p className="text-xs font-medium uppercase tracking-wide text-white/60 opacity-0 transition-all duration-300 delay-[187ms] ease-out group-data-[active=true]:opacity-100">
                {item.meta}
              </p>
            )}

            <p className="w-full max-w-xs text-sm text-white/80 opacity-0 transition-all duration-300 delay-225 ease-out group-data-[active=true]:opacity-100">
              {item.description}
            </p>
          </article>
        </li>
      ))}
    </ul>
  );
});
ExpandingCards.displayName = "ExpandingCards";
