import React, { useEffect } from 'react';

const Forbidden403 = () => {
    useEffect(() => {
        const prevTitle = document.title;
        document.title = '403 Forbidden';
        return () => {
            document.title = prevTitle;
        };
    }, []);

    return (
        <div className="fixed inset-0 z-[999999] bg-white flex flex-col items-center justify-center text-center p-4 select-none font-sans">
            <h1 className="text-8xl sm:text-9xl font-bold text-[#404040] tracking-normal leading-none mb-3">
                403
            </h1>
            <p className="text-2xl sm:text-3xl font-bold text-[#2d3748] tracking-tight">
                Forbidden
            </p>
        </div>
    );
};

export default Forbidden403;
