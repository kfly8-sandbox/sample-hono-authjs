import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export function SignUpForm({ className, ...props }: React.ComponentProps<"form">) {
  return (
    <form className={cn("flex flex-col gap-6", className)} {...props}>
      <input type="hidden" name="csrf_token" value="TODO" />
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-2xl font-bold">アカウントを作成する</h1>
        <p className="text-muted-foreground text-sm text-balance">メールアドレスをご入力ください</p>
      </div>
      <div className="grid gap-6">
        <div className="grid gap-3">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" placeholder="m@example.com" required />
          <input type="checkbox" name="accept_terms" value="1" required />
          <a href="/terms" className="text-sm text-muted-foreground">利用規約</a>に同意する
          <input type="checkbox" name="accept_privacy_policy" value="1" required />
          <a href="/privacy_policy" className="text-sm text-muted-foreground">プライバシーポリシー</a>に同意する
        </div>
        <Button type="submit" className="w-full">
          認証コードを送信する
        </Button>
      </div>
    </form>
  );
}
