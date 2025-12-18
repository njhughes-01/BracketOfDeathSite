import React from 'react';
interface StatCardProps {
    title: string;
    value: string | number;
    icon: string;
    iconColor: string;
    linkTo?: string;
    linkText?: string;
    loading?: boolean;
    trend?: {
        value: number;
        isPositive: boolean;
    };
}
declare const StatCard: React.FC<StatCardProps>;
export default StatCard;
//# sourceMappingURL=StatCard.d.ts.map