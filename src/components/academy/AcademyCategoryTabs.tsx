'use client'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { AcademyCategory } from '@/lib/academy-types'

interface AcademyCategoryTabsProps {
    categories: Array<{ value: 'all' | AcademyCategory; label: string }>
    activeCategory: 'all' | AcademyCategory
    onChange: (category: 'all' | AcademyCategory) => void
}

export function AcademyCategoryTabs({
    categories,
    activeCategory,
    onChange,
}: AcademyCategoryTabsProps) {
    return (
        <div className="flex flex-wrap gap-2">
            {categories.map((category) => {
                const isActive = category.value === activeCategory
                return (
                    <Button
                        key={category.value}
                        variant={isActive ? 'default' : 'outline'}
                        className={cn('rounded-full px-4', !isActive && 'bg-background/82')}
                        onClick={() => onChange(category.value)}
                    >
                        {category.label}
                    </Button>
                )
            })}
        </div>
    )
}
