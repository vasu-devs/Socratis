import InterviewRoom from '@/components/interview/InterviewRoom';

export default function InterviewPage({ params }: { params: { id: string } }) {
    return (
        <div className="h-screen w-screen bg-background overflow-hidden">
            <InterviewRoom sessionId={params.id} />
        </div>
    );
}
