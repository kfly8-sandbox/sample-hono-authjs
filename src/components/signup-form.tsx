import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export function SignUpForm({ className, ...props }: React.ComponentProps<"form">) {
  return (
    <form className={cn("flex flex-col gap-6", className)} {...props}>
      <input type="hidden" name="csrf_token" value="TODO" />
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-2xl font-bold">アカウントを作成する</h1>
      </div>
      <div className="grid gap-6">
        <div className="grid gap-3">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" placeholder="m@example.com" required />

          <div className="flex items-center space-x-2">
            <Checkbox id="accept_terms" name="accept_terms" value="1" required />
            <div className="flex items-center space-x-1">
              <a href="/terms" className="text-sm text-muted-foreground hover:underline">利用規約</a>
              <Label htmlFor="accept_terms" className="text-sm">に同意する</Label>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox id="accept_privacy_policy" name="accept_privacy_policy" value="1" required />
            <div className="flex items-center space-x-1">
              <a href="/privacy_policy" className="text-sm text-muted-foreground hover:underline">プライバシーポリシー</a>
              <Label htmlFor="accept_privacy_policy" className="text-sm">に同意する</Label>
            </div>
          </div>
        </div>
        <Button type="submit" className="w-full">
          認証コードを送信する
        </Button>
      </div>
    </form>
  );
}
